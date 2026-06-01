import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import Anthropic from '@anthropic-ai/sdk'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { isMathSubjectCode } from '@/lib/marking/math-subjects'
import { SUBJECT_CODE_MAP } from '@/lib/profile-options'
import type { OcrLine } from '@/lib/examiner-ink-positioning'
import { runSingleQuestionMark } from '@/lib/marking/single-question-pipeline'
import { formatSseEvent, SSE_HEADERS } from '@/lib/marking/sse'
import {
  ANSWER_OCR_PROMPT_MATH,
  ANSWER_OCR_PROMPT_GENERAL,
  WHOLE_PAPER_OCR_PROMPT,
  parseOcrAnswer,
  questionPhotoOcrPrompt,
} from '@/lib/marking/ocr'
import {
  aggregateWholePaperResults,
  buildWholePaperSegmentPrompt,
  parseWholePaperSegment,
} from '@/lib/marking/whole-paper'
import type { UploadMode, QuestionMarkResult } from '@/lib/marking/types'
import {
  withGeminiRetry,
  withAnthropicRetry,
  isTransientOverloadError,
} from '@/lib/marking/gemini-retry'
import {
  ocrAnswerBufferWithBoxes,
  uploadAnswerPhoto as uploadAnswerPhotoBuffer,
} from '@/lib/marking/mark-runner'
import {
  checkMarkAllowance,
  recordMarkUsage,
  allowanceForResponse,
  quotaExceededBody,
  type MarkAllowance,
} from '@/lib/billing/enforcement'
import {
  checkAnonymousMarkRateLimit,
  clientIp,
  incrementAnonymousMarkRateLimit,
} from '@/lib/rate-limit'
import { rateLimitJson } from '@/lib/http/rate-limit-response'
import { signMarkPayloadForClient } from '@/lib/storage/answer-photos'

export const maxDuration = 300

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function ocrImage(file: File, prompt: string): Promise<string> {
  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const response = await withGeminiRetry(
    () =>
      genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: file.type, data: base64 } },
              { text: prompt },
            ],
          },
        ],
      }),
    { label: 'ocr' }
  )
  return response.text || ''
}

async function ocrAnswerWithBoxes(
  file: File,
  uploadMode: UploadMode,
  subjectCode?: string
): Promise<{ full_text: string; lines: OcrLine[] }> {
  const isMath = isMathSubjectCode(subjectCode)
  const prompt =
    uploadMode === 'whole_paper'
      ? WHOLE_PAPER_OCR_PROMPT
      : isMath
        ? ANSWER_OCR_PROMPT_MATH
        : ANSWER_OCR_PROMPT_GENERAL
  const raw = await ocrImage(file, prompt)
  return parseOcrAnswer(raw)
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const supabaseAuth = await createServerClient()
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()
    const userId = user?.id || null

    const ip = clientIp(request)
    const rateCheck = await checkAnonymousMarkRateLimit(supabaseAdmin, ip, userId)
    if (!rateCheck.allowed) {
      return rateLimitJson(rateCheck.message)
    }
    const anonMarkCount = rateCheck.count

    // Signed-in users rely on subscription quotas; guests use the IP cap above.
    let allowance: MarkAllowance | null = null
    if (userId) {
      allowance = await checkMarkAllowance(userId)
      if (allowance.blocked_by_mode) {
        return NextResponse.json(quotaExceededBody(allowance), { status: 402 })
      }
    }

    const formData = await request.formData()
    const pageFiles: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('pages') && value instanceof File && value.size > 0) {
        pageFiles.push(value)
      }
    }
    const answerPhoto = formData.get('photo') as File | null
    if (pageFiles.length === 0 && answerPhoto?.size) {
      pageFiles.push(answerPhoto)
    }
    const questionPhoto = formData.get('question_photo') as File | null
    const questionTextInput = formData.get('question_text') as string | null
    const manualPaperCode = formData.get('manual_paper_code') as string | null
    const manualPaperSession = formData.get('manual_paper_session') as string | null
    const manualQuestionNumber = formData.get('manual_question_number') as string | null
    const uploadModeRaw = formData.get('upload_mode') as string | null
    const uploadMode: UploadMode =
      uploadModeRaw === 'whole_paper' ? 'whole_paper' : 'single_question'
    const manualSubjectCode = manualPaperCode?.split('/')[0]
    const streamRequested = formData.get('stream') === '1'

    if (pageFiles.length === 0) {
      return NextResponse.json({ error: 'Answer photo is required' }, { status: 400 })
    }

    if (uploadMode === 'single_question') {
      const pipelineInput = {
        pageFiles,
        questionPhoto: questionPhoto?.size ? questionPhoto : null,
        questionTextInput: questionTextInput?.trim() || '',
        manualPaperCode,
        manualPaperSession,
        manualQuestionNumber,
        userId,
        startedAt: startTime,
      }

      const bumpRateLimit = async () => {
        await incrementAnonymousMarkRateLimit(
          supabaseAdmin,
          ip,
          userId,
          anonMarkCount
        )
      }

      const clientError = (message: string) =>
        NextResponse.json({ error: message }, { status: 400 })

      if (streamRequested) {
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          async start(controller) {
            const send = (data: unknown) =>
              controller.enqueue(encoder.encode(formatSseEvent(data)))
            try {
              const payload = await runSingleQuestionMark({
                ...pipelineInput,
                onProgress: (ev) => send(ev),
              })
              await bumpRateLimit()
              if (userId) {
                await recordMarkUsage(
                  userId,
                  (payload as { attempt_id?: string })?.attempt_id ?? null,
                  'mark_single'
                )
              }
              send({
                type: 'result',
                payload: await signMarkPayloadForClient({
                  ...payload,
                  _allowance: allowance ? allowanceForResponse(allowance) : undefined,
                }),
              })
              controller.close()
            } catch (err: unknown) {
              const isOverload = isTransientOverloadError(err)
              const message =
                err instanceof Error
                  ? err.message
                  : 'Something went wrong while marking. Please try again.'
              const isClient =
                message.includes('handwriting') ||
                message.includes('past paper question')
              send({
                type: 'error',
                error: isOverload
                  ? 'Marking is busy right now — please try again in a moment.'
                  : message,
                retryable: isOverload,
                status: isClient ? 400 : isOverload ? 503 : 500,
              })
              controller.close()
            }
          },
        })
        return new Response(stream, { headers: SSE_HEADERS })
      }

      try {
        const payload = await runSingleQuestionMark(pipelineInput)
        await bumpRateLimit()
        if (userId) {
          await recordMarkUsage(
            userId,
            (payload as { attempt_id?: string })?.attempt_id ?? null,
            'mark_single'
          )
        }
        return NextResponse.json(
          await signMarkPayloadForClient({
            ...payload,
            _allowance: allowance ? allowanceForResponse(allowance) : undefined,
          })
        )
      } catch (err: unknown) {
        const isOverload = isTransientOverloadError(err)
        const message =
          err instanceof Error
            ? err.message
            : 'Something went wrong while marking. Please try again.'
        if (
          message.includes('handwriting') ||
          message.includes('past paper question')
        ) {
          return clientError(message)
        }
        return NextResponse.json(
          {
            error: isOverload
              ? 'Marking is busy right now — please try again in a moment.'
              : message,
            retryable: isOverload,
          },
          { status: isOverload ? 503 : 500 }
        )
      }
    }

    const pageOcrResults: Array<{
      full_text: string
      lines: OcrLine[]
      photo_url: string | null
    }> = []

    for (let i = 0; i < pageFiles.length; i++) {
      const file = pageFiles[i]
      const buf = Buffer.from(await file.arrayBuffer())
      const [{ full_text, lines }, photo_url] = await Promise.all([
        ocrAnswerBufferWithBoxes(
          buf,
          file.type || 'image/jpeg',
          manualSubjectCode
        ),
        uploadAnswerPhotoBuffer(buf, file.type || 'image/jpeg', userId),
      ])
      pageOcrResults.push({ full_text, lines, photo_url })
    }

    const ocrText = pageOcrResults
      .map((p, i) => `[Page ${i + 1}]\n${p.full_text}`)
      .join('\n\n')
    const ocrLines = pageOcrResults.flatMap((p) => p.lines)
    const answerPhotoUrl = pageOcrResults[0]?.photo_url ?? null
    const pagePhotoUrls = pageOcrResults
      .map((p) => p.photo_url)
      .filter((u): u is string => !!u)

    if (!ocrText || ocrText.trim().length < 5) {
      return NextResponse.json(
        { error: 'No handwriting detected. Try a clearer photo.' },
        { status: 400 }
      )
    }

    let questionText = questionTextInput?.trim() || ''
    const subjectHint = manualSubjectCode
      ? SUBJECT_CODE_MAP[manualSubjectCode]
      : undefined

    if (questionPhoto && !questionText) {
      questionText = await ocrImage(
        questionPhoto,
        questionPhotoOcrPrompt(subjectHint)
      )
    }

    // ============ WHOLE PAPER MODE ============
    if (uploadMode === 'whole_paper') {
      let paperCode = manualPaperCode || undefined
      let paperSession = manualPaperSession || undefined

      const segResponse = await withAnthropicRetry(
        () =>
          anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4000,
            messages: [
              {
                role: 'user',
                content: buildWholePaperSegmentPrompt(ocrText),
              },
            ],
          }),
        { label: 'claude-whole-paper-segment' }
      )
      const segText =
        segResponse.content[0].type === 'text'
          ? segResponse.content[0].text
          : ''
      const segments = parseWholePaperSegment(segText)

      if (!segments || segments.questions.length === 0) {
        return NextResponse.json(
          {
            error:
              'Could not segment your paper into questions. Try single-question mode or a clearer photo.',
          },
          { status: 400 }
        )
      }

      paperCode = paperCode || segments.paper_code
      paperSession = paperSession || segments.paper_session

      if (!paperCode || !paperSession) {
        return NextResponse.json(
          {
            error:
              'Please select the paper (subject, session, component) so we can load the mark scheme.',
          },
          { status: 400 }
        )
      }

      const questionResults: QuestionMarkResult[] = []

      const { markWholePaperQuestionSafe } = await import(
        '@/lib/marking/mark-runner'
      )
      const { fetchPaperQuestionMeta } = await import(
        '@/lib/marking/paper-questions'
      )

      for (const seg of segments.questions.slice(0, 15)) {
        const qResult = await markWholePaperQuestionSafe({
          paperCode,
          paperSession,
          questionNumber: seg.question_number,
          answerText: seg.answer_text,
        })
        questionResults.push({ ...qResult, answer_text: seg.answer_text })
      }

      const paperQuestions = await fetchPaperQuestionMeta(
        paperCode,
        paperSession,
        {
          listSchemes: async (code, session) => {
            const { data } = await supabaseAdmin
              .from('mark_schemes')
              .select('question_number, total_marks')
              .eq('paper_code', code)
              .eq('paper_session', session)
            return data || []
          },
        }
      )

      const wholePaper = aggregateWholePaperResults(
        paperCode,
        paperSession,
        questionResults,
        paperQuestions
      )

      const timeSpentSeconds = Math.max(
        1,
        Math.round((Date.now() - startTime) / 1000)
      )

      const { data: attempt } = await supabaseAdmin
        .from('attempts')
        .insert({
          mark_scheme_id: null,
          source_type: 'past_paper',
          user_id: userId,
          question_text: `Whole paper: ${paperCode} ${paperSession}`,
          ocr_text: ocrText,
          ai_marking: wholePaper,
          marks_earned: wholePaper.marks_earned,
          total_marks: wholePaper.total_marks,
          syllabus_tags: [],
          time_spent_seconds: timeSpentSeconds,
          answer_photo_url: answerPhotoUrl,
          error_classifications: [],
          line_references: [],
        })
        .select()
        .single()

      await incrementAnonymousMarkRateLimit(
        supabaseAdmin,
        ip,
        userId,
        anonMarkCount
      )

      // Whole paper = exactly 1 mark (not N questions).
      if (userId) {
        await recordMarkUsage(userId, attempt?.id ?? null, 'mark_whole_paper')
      }

      return NextResponse.json(
        await signMarkPayloadForClient({
          upload_mode: 'whole_paper',
          whole_paper: wholePaper,
          marks_earned: wholePaper.marks_earned,
          total_marks: wholePaper.total_marks,
          attempt_id: attempt?.id,
          answer_photo_url: answerPhotoUrl,
          marking_mode: 'official_mark_scheme',
          _allowance: allowance ? allowanceForResponse(allowance) : undefined,
        })
      )
    }

    return NextResponse.json(
      { error: 'Invalid upload mode' },
      { status: 400 }
    )
  } catch (err: unknown) {
    const isOverload = isTransientOverloadError(err)
    console.error('Marking error:', err)
    return NextResponse.json(
      {
        error: isOverload
          ? 'Marking is busy right now — please try again in a moment.'
          : 'Something went wrong while marking. Please try again.',
        retryable: isOverload,
      },
      { status: isOverload ? 503 : 500 }
    )
  }
}
