import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GEMINI_FLASH_MODEL, generateGeminiText, generateGeminiWithContents } from '@/lib/ai/gemini-text'
import { geminiBackendLabel } from '@/lib/ai/gemini-config'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { SUBJECT_CODE_MAP } from '@/lib/profile-options'
import type { OcrLine } from '@/lib/examiner-ink-positioning'
import { runSingleQuestionMark } from '@/lib/marking/single-question-pipeline'
import { formatSseEvent, SSE_HEADERS } from '@/lib/marking/sse'
import { questionPhotoOcrPrompt } from '@/lib/marking/ocr'
import {
  aggregateWholePaperResults,
  buildWholePaperSegmentPrompt,
  parseWholePaperSegment,
} from '@/lib/marking/whole-paper'
import type {
  MarkIntent,
  UploadMode,
  QuestionMarkResult,
} from '@/lib/marking/types'
import {
  getGeminiRetryStats,
} from '@/lib/marking/gemini-retry'
import { classifyMarkingError, type ClassifiedMarkingError } from '@/lib/marking/classify-marking-error'
import {
  ocrAnswerBufferWithBoxes,
  uploadAnswerPhoto as uploadAnswerPhotoBuffer,
} from '@/lib/marking/mark-runner'
import {
  reserveMarkUsage,
  finalizeMarkReservation,
  releaseMarkReservation,
  allowanceForResponse,
  quotaExceededBody,
  type MarkReservation,
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

function logMarkFailure(err: unknown, classified: ClassifiedMarkingError) {
  console.error('[mark/process] failed', {
    backend: geminiBackendLabel(),
    code: classified.code,
    status: classified.status,
    retries: getGeminiRetryStats(),
    detail: err instanceof Error ? err.message.slice(0, 600) : String(err),
  })
}

async function ocrImage(file: File, prompt: string): Promise<string> {
  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const response = await generateGeminiWithContents(
    [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: file.type, data: base64 } },
          { text: prompt },
        ],
      },
    ],
    { task: 'ocr', model: GEMINI_FLASH_MODEL }
  )
  return response.text || ''
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  // Reservation lives at function scope so the outer catch can release it.
  let reservation: MarkReservation | null = null
  let reservationSettled = false // flips once on finalize OR release → exactly-once

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
    // Reserved just below (once uploadMode is known). These helpers settle the
    // reservation exactly once: whichever of finalize/release runs first wins.
    const finalizeReservation = async (
      attemptId: string | null,
      eventType: 'mark_single' | 'mark_whole_paper'
    ) => {
      if (userId && reservation && !reservationSettled) {
        reservationSettled = true
        await finalizeMarkReservation(userId, reservation, attemptId, eventType)
      }
    }
    const releaseReservation = async () => {
      if (reservation && !reservationSettled) {
        reservationSettled = true
        await releaseMarkReservation(reservation)
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
    const answerPdf = formData.get('answer_pdf') as File | null
    const questionPhoto = formData.get('question_photo') as File | null
    const questionTextInput = formData.get('question_text') as string | null
    const manualPaperCode = formData.get('manual_paper_code') as string | null
    const manualPaperSession = formData.get('manual_paper_session') as string | null
    const manualQuestionNumber = formData.get('manual_question_number') as string | null
    const uploadModeRaw = formData.get('upload_mode') as string | null
    const uploadMode: UploadMode =
      uploadModeRaw === 'whole_paper' ? 'whole_paper' : 'single_question'
    const markIntentRaw = formData.get('mark_intent') as string | null
    const markIntent: MarkIntent =
      markIntentRaw === 'practice_question'
        ? 'practice_question'
        : markIntentRaw === 'combined_script'
          ? 'combined_script'
          : 'past_paper'
    const practiceSubjectCode = (
      formData.get('practice_subject_code') as string | null
    )?.trim() || null
    // M1: optional IB selection axes. Absent for all current traffic (inert).
    const ibComponentKey = (
      formData.get('ib_component_key') as string | null
    )?.trim() || null
    const ibLevel = (formData.get('ib_level') as string | null)?.trim() || null
    const ibMarksRaw = (formData.get('ib_marks_available') as string | null)?.trim()
    const ibMarksAvailable =
      ibMarksRaw && Number.isFinite(Number(ibMarksRaw)) && Number(ibMarksRaw) > 0
        ? Math.round(Number(ibMarksRaw))
        : null
    const manualSubjectCode = manualPaperCode?.split('/')[0]
    const streamRequested = formData.get('stream') === '1'

    if (pageFiles.length === 0 && !answerPdf?.size) {
      return NextResponse.json({ error: 'Answer photo is required' }, { status: 400 })
    }

    if (userId) {
      reservation = await reserveMarkUsage(
        userId,
        uploadMode === 'whole_paper' ? 'mark_whole_paper' : 'mark_single'
      )
      if (reservation.blocked_by_mode) {
        return NextResponse.json(quotaExceededBody(reservation.allowance), { status: 402 })
      }
    }

    if (uploadMode === 'single_question') {
      const pipelineInput = {
        pageFiles,
        answerPdf: answerPdf?.size ? answerPdf : null,
        questionPhoto: questionPhoto?.size ? questionPhoto : null,
        questionTextInput: questionTextInput?.trim() || '',
        manualPaperCode:
          markIntent === 'practice_question' || markIntent === 'combined_script'
            ? null
            : manualPaperCode,
        manualPaperSession:
          markIntent === 'practice_question' || markIntent === 'combined_script'
            ? null
            : manualPaperSession,
        manualQuestionNumber:
          markIntent === 'practice_question' || markIntent === 'combined_script'
            ? null
            : manualQuestionNumber,
        markIntent,
        practiceSubjectCode:
          markIntent === 'practice_question' || markIntent === 'combined_script'
            ? practiceSubjectCode
            : null,
        ibComponentKey:
          markIntent === 'practice_question' || markIntent === 'combined_script'
            ? ibComponentKey
            : null,
        ibLevel:
          markIntent === 'practice_question' || markIntent === 'combined_script'
            ? ibLevel
            : null,
        questionMarks:
          markIntent === 'practice_question' || markIntent === 'combined_script'
            ? ibMarksAvailable
            : null,
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
            const heartbeat = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(': heartbeat\n\n'))
              } catch {
                clearInterval(heartbeat)
              }
            }, 12_000)
            try {
              const payload = await runSingleQuestionMark({
                ...pipelineInput,
                onProgress: (ev) => send(ev),
              })
              await bumpRateLimit()
              await finalizeReservation(
                (payload as { attempt_id?: string })?.attempt_id ?? null,
                'mark_single'
              )
              send({
                type: 'result',
                payload: await signMarkPayloadForClient({
                  ...payload,
                  _allowance: reservation ? allowanceForResponse(reservation.allowance) : undefined,
                }),
              })
              controller.close()
            } catch (err: unknown) {
              await releaseReservation()
              const classified = classifyMarkingError(err)
              logMarkFailure(err, classified)
              send({
                type: 'error',
                error: classified.message,
                retryable: classified.retryable,
                status: classified.status,
              })
              controller.close()
            } finally {
              clearInterval(heartbeat)
            }
          },
        })
        return new Response(stream, { headers: SSE_HEADERS })
      }

      try {
        const payload = await runSingleQuestionMark(pipelineInput)
        await bumpRateLimit()
        await finalizeReservation(
          (payload as { attempt_id?: string })?.attempt_id ?? null,
          'mark_single'
        )
        return NextResponse.json(
          await signMarkPayloadForClient({
            ...payload,
            _allowance: reservation ? allowanceForResponse(reservation.allowance) : undefined,
          })
        )
      } catch (err: unknown) {
        await releaseReservation()
        const classified = classifyMarkingError(err)
        logMarkFailure(err, classified)
        if (classified.code === 'client' || classified.code === 'ocr_empty') {
          return clientError(classified.message)
        }
        return NextResponse.json(
          {
            error: classified.message,
            retryable: classified.retryable,
            code: classified.code,
          },
          { status: classified.status }
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
    const answerPhotoUrl = pageOcrResults[0]?.photo_url ?? null

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

      const segText = await generateGeminiText(
        buildWholePaperSegmentPrompt(ocrText),
        { task: 'structured-extraction', maxOutputTokens: 4000 }
      )
      const segments = parseWholePaperSegment(segText)

      if (!segments || segments.questions.length === 0) {
        await releaseReservation()
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
        await releaseReservation()
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
      await finalizeReservation(attempt?.id ?? null, 'mark_whole_paper')
      if (userId) {
        const { isCommunityEnabled } = await import('@/lib/community/enabled')
        if (isCommunityEnabled() && attempt?.id) {
          const subjectCode = paperCode?.split('/')[0] ?? null
          const { awardMarkingXp } = await import('@/lib/community/feed')
          await awardMarkingXp(userId, subjectCode, attempt.id)
        }
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
          _allowance: reservation ? allowanceForResponse(reservation.allowance) : undefined,
        })
      )
    }

    return NextResponse.json(
      { error: 'Invalid upload mode' },
      { status: 400 }
    )
  } catch (err: unknown) {
    if (reservation && !reservationSettled) {
      reservationSettled = true
      await releaseMarkReservation(reservation)
    }
    const classified = classifyMarkingError(err)
    logMarkFailure(err, classified)
    return NextResponse.json(
      {
        error: classified.message,
        retryable: classified.retryable,
        code: classified.code,
      },
      { status: classified.status }
    )
  }
}
