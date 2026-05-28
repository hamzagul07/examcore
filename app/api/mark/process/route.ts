import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import Anthropic from '@anthropic-ai/sdk'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { normalizeSyllabusTagsForSubject, type SyllabusCode } from '@/lib/syllabi'
import {
  buildLineReferences,
  type OcrLine,
} from '@/lib/examiner-ink-positioning'
import { normalizeErrorClassification } from '@/lib/error-classifications'
import { SUBJECT_CODE_MAP } from '@/lib/profile-options'
import { parsePaperCode } from '@/lib/marking/component-types'
import { buildMarkingPrompt, maxTokensForStyle } from '@/lib/marking/build-marking-prompt'
import { extractJSON } from '@/lib/marking/json'
import {
  tryExtractFromStorage,
  resolveQuestionMarkingStyle,
} from '@/lib/marking/storage-extract'
import {
  ANSWER_OCR_PROMPT_MATH,
  ANSWER_OCR_PROMPT_GENERAL,
  WHOLE_PAPER_OCR_PROMPT,
  parseOcrAnswer,
  questionPhotoOcrPrompt,
} from '@/lib/marking/ocr'
import {
  buildDetectionPrompt,
} from '@/lib/marking/prompts'
import {
  aggregateWholePaperResults,
  buildWholePaperSegmentPrompt,
  parseWholePaperSegment,
  toMarkingAIResult,
} from '@/lib/marking/whole-paper'
import type {
  MarkSchemeRow,
  MarkingMode,
  UploadMode,
  QuestionMarkResult,
} from '@/lib/marking/types'
import {
  withGeminiRetry,
  withAnthropicRetry,
  isTransientOverloadError,
} from '@/lib/marking/gemini-retry'

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
  const isMath = subjectCode === '9709' || !subjectCode
  const prompt =
    uploadMode === 'whole_paper'
      ? WHOLE_PAPER_OCR_PROMPT
      : isMath
        ? ANSWER_OCR_PROMPT_MATH
        : ANSWER_OCR_PROMPT_GENERAL
  const raw = await ocrImage(file, prompt)
  return parseOcrAnswer(raw)
}

async function uploadAnswerPhoto(
  file: File,
  userId: string | null
): Promise<string | null> {
  try {
    const bytes = await file.arrayBuffer()
    const ext = (file.type.split('/')[1] || 'jpg').toLowerCase()
    const prefix = userId || 'anon'
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('answer-photos')
      .upload(path, Buffer.from(bytes), {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      })
    if (uploadError) {
      console.error('answer-photos upload error:', uploadError)
      return null
    }
    const { data: pub } = supabaseAdmin.storage
      .from('answer-photos')
      .getPublicUrl(path)
    return pub?.publicUrl || null
  } catch (err) {
    console.error('uploadAnswerPhoto unexpected error:', err)
    return null
  }
}

const storageDeps = {
  downloadPdf: async (path: string) => {
    const { data, error } = await supabaseAdmin.storage
      .from('paper-pdfs')
      .download(path)
    if (error || !data) return null
    return data.arrayBuffer()
  },
  extractFromPdfs: async (
    qpBase64: string,
    msBase64: string,
    prompt: string
  ) => {
    const extractionResponse = await withGeminiRetry(
      () =>
        genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: 'application/pdf', data: qpBase64 } },
                { inlineData: { mimeType: 'application/pdf', data: msBase64 } },
                { text: prompt },
              ],
            },
          ],
        }),
      { label: 'pdf-extraction' }
    )
    return extractionResponse.text || ''
  },
  upsertSchemes: async (rows: Record<string, unknown>[]) => {
    const { error } = await supabaseAdmin
      .from('mark_schemes')
      .upsert(rows, { onConflict: 'paper_code,paper_session,question_number' })
    if (error) console.error('Mark scheme upsert error:', error)
  },
  findScheme: async (
    paperCode: string,
    paperSession: string,
    questionNumber: string
  ) => {
    const { data } = await supabaseAdmin
      .from('mark_schemes')
      .select('*')
      .eq('paper_code', paperCode)
      .eq('paper_session', paperSession)
      .eq('question_number', questionNumber)
      .maybeSingle()
    return (data as MarkSchemeRow) ?? null
  },
}

async function lookupMarkScheme(
  paperCode: string,
  paperSession: string,
  questionNumber: string
): Promise<{ scheme: MarkSchemeRow | null; mode: MarkingMode }> {
  const { data: foundScheme } = await supabaseAdmin
    .from('mark_schemes')
    .select('*')
    .eq('paper_code', paperCode)
    .eq('paper_session', paperSession)
    .eq('question_number', questionNumber)
    .maybeSingle()

  if (foundScheme) {
    return { scheme: foundScheme as MarkSchemeRow, mode: 'official_mark_scheme' }
  }

  const extracted = await tryExtractFromStorage(
    paperCode,
    paperSession,
    questionNumber,
    storageDeps
  )
  if (extracted) {
    return { scheme: extracted, mode: 'official_mark_scheme' }
  }
  return { scheme: null, mode: 'general_criteria_paper_not_in_db' }
}

async function runClaudeMarking(
  prompt: string,
  maxTokens: number
): Promise<Record<string, unknown>> {
  const claudeResponse = await withAnthropicRetry(
    () =>
      anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    { label: 'claude-marking' }
  )
  const markingText =
    claudeResponse.content[0].type === 'text'
      ? claudeResponse.content[0].text
      : ''
  return extractJSON(markingText) as Record<string, unknown>
}

async function markSingleQuestion(params: {
  ocrText: string
  ocrLines: OcrLine[]
  questionText: string
  markScheme: MarkSchemeRow | null
  markingMode: MarkingMode
  paperCode?: string
  paperSession?: string
  questionNumber?: string
}): Promise<{
  markingResult: Record<string, unknown>
  lineReferences: ReturnType<typeof buildLineReferences>
  errorClassifications: unknown[]
  resolvedTags: SyllabusCode[]
  markingMode: MarkingMode
}> {
  const {
    ocrText,
    ocrLines,
    questionText,
    markScheme,
    markingMode: initialMode,
    paperCode,
  } = params

  let markingMode = initialMode

  const parsed = paperCode ? parsePaperCode(paperCode) : null
  const subjectCode = parsed?.subjectCode ?? '9709'
  const subjectName = SUBJECT_CODE_MAP[subjectCode] || 'A-Level'
  const markingStyle = markScheme
    ? resolveQuestionMarkingStyle(markScheme, paperCode || '9709/12')
    : subjectCode === '9709'
      ? 'point_based'
      : 'point_based'

  const isOfficial = markingMode === 'official_mark_scheme' && !!markScheme

  if (markingMode === 'general_criteria' && subjectCode === '9709') {
    // preserve legacy math general path
  } else if (
    markingMode === 'general_criteria_paper_not_in_db' &&
    !questionText.trim()
  ) {
    markingMode = 'general_criteria'
  }

  const markingPrompt = buildMarkingPrompt({
    markScheme,
    markingStyle,
    ocrText,
    questionText,
    subjectName,
    subjectCode,
    isOfficial,
  })

  const markingResult = await runClaudeMarking(
    markingPrompt,
    maxTokensForStyle(markingStyle)
  )

  const lineReferences = buildLineReferences(
    Array.isArray(markingResult?.marks_awarded)
      ? markingResult.marks_awarded
      : [],
    ocrLines
  )

  const errorClassifications = Array.isArray(markingResult?.marks_awarded)
    ? markingResult.marks_awarded.map((m: Record<string, unknown>, idx: number) => {
        const classification = normalizeErrorClassification(
          m?.error_classification as string
        )
        return {
          mark_id:
            typeof m?.type === 'string' && m.type.trim()
              ? m.type.trim().toUpperCase()
              : `M${idx + 1}`,
          classification,
          description:
            typeof m?.margin_note === 'string' && m.margin_note.trim()
              ? m.margin_note.trim()
              : typeof m?.reasoning === 'string'
                ? m.reasoning.slice(0, 240)
                : '',
          line_reference:
            typeof m?.line_reference === 'string' ? m.line_reference.trim() : '',
        }
      })
    : []

  const claudeTags: SyllabusCode[] = normalizeSyllabusTagsForSubject(
    subjectCode,
    markingResult?.syllabus_tags
  )
  let resolvedTags: SyllabusCode[] = []
  const cachedTags: SyllabusCode[] = Array.isArray(markScheme?.syllabus_tags)
    ? normalizeSyllabusTagsForSubject(subjectCode, markScheme.syllabus_tags)
    : []

  if (markingMode === 'official_mark_scheme' && markScheme) {
    if (cachedTags.length > 0) {
      resolvedTags = cachedTags
    } else {
      resolvedTags = claudeTags
      if (resolvedTags.length > 0 && markScheme.id) {
        await supabaseAdmin
          .from('mark_schemes')
          .update({ syllabus_tags: resolvedTags })
          .eq('id', markScheme.id)
      }
    }
  } else {
    resolvedTags = claudeTags
  }

  return {
    markingResult,
    lineReferences,
    errorClassifications,
    resolvedTags,
    markingMode,
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const today = new Date().toISOString().split('T')[0]

    const { data: existingLimit } = await supabaseAdmin
      .from('rate_limits')
      .select('mark_count')
      .eq('ip', ip)
      .eq('date', today)
      .maybeSingle()

    if (existingLimit && existingLimit.mark_count >= 10) {
      return NextResponse.json(
        {
          error:
            'Daily limit reached (10 marks per day). The free beta is rate-limited to prevent abuse. Try again tomorrow.',
        },
        { status: 429 }
      )
    }

    const currentCount = existingLimit?.mark_count || 0

    const supabaseAuth = await createServerClient()
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()
    const userId = user?.id || null

    const formData = await request.formData()
    const answerPhoto = formData.get('photo') as File
    const questionPhoto = formData.get('question_photo') as File | null
    const questionTextInput = formData.get('question_text') as string | null
    const manualPaperCode = formData.get('manual_paper_code') as string | null
    const manualPaperSession = formData.get('manual_paper_session') as string | null
    const manualQuestionNumber = formData.get('manual_question_number') as string | null
    const uploadModeRaw = formData.get('upload_mode') as string | null
    const uploadMode: UploadMode =
      uploadModeRaw === 'whole_paper' ? 'whole_paper' : 'single_question'
    const manualSubjectCode = manualPaperCode?.split('/')[0]

    const hasManualSelection = !!(
      manualPaperCode &&
      manualPaperSession &&
      manualQuestionNumber
    )

    if (!answerPhoto) {
      return NextResponse.json({ error: 'Answer photo is required' }, { status: 400 })
    }

    const [{ full_text: ocrText, lines: ocrLines }, answerPhotoUrl] =
      await Promise.all([
        ocrAnswerWithBoxes(answerPhoto, uploadMode, manualSubjectCode),
        uploadAnswerPhoto(answerPhoto, userId),
      ])

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

      for (const seg of segments.questions.slice(0, 15)) {
        const { scheme, mode } = await lookupMarkScheme(
          paperCode,
          paperSession,
          seg.question_number
        )
        const style = scheme
          ? resolveQuestionMarkingStyle(scheme, paperCode)
          : 'point_based'

        const { markingResult } = await markSingleQuestion({
          ocrText: seg.answer_text,
          ocrLines: [],
          questionText: scheme?.question_text || '',
          markScheme: scheme,
          markingMode: scheme ? mode : 'general_criteria_paper_not_in_db',
          paperCode,
          paperSession,
          questionNumber: seg.question_number,
        })

        const ai = toMarkingAIResult(markingResult)
        questionResults.push({
          question_number: seg.question_number,
          marks_earned: ai.marks_earned,
          total_marks: ai.total_marks,
          marking_style: style,
          summary: ai.summary,
          ai_marking: ai,
          mark_scheme_id: scheme?.id ?? null,
        })
      }

      const wholePaper = aggregateWholePaperResults(
        paperCode,
        paperSession,
        questionResults
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

      await supabaseAdmin.from('rate_limits').upsert(
        { ip, date: today, mark_count: currentCount + 1 },
        { onConflict: 'ip,date' }
      )

      return NextResponse.json({
        upload_mode: 'whole_paper',
        whole_paper: wholePaper,
        marks_earned: wholePaper.marks_earned,
        total_marks: wholePaper.total_marks,
        attempt_id: attempt?.id,
        answer_photo_url: answerPhotoUrl,
        marking_mode: 'official_mark_scheme',
      })
    }

    // ============ SINGLE QUESTION MODE (existing flow) ============
    let detection: Record<string, unknown> = { is_past_paper: false }

    if (hasManualSelection) {
      detection = {
        is_past_paper: true,
        confidence: 'high',
        paper_code: manualPaperCode,
        paper_session: manualPaperSession,
        question_number: manualQuestionNumber,
        reasoning: 'Manually selected by user',
      }
    } else {
      const detectionResponse = await withAnthropicRetry(
        () =>
          anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 500,
            messages: [
              {
                role: 'user',
                content: buildDetectionPrompt(ocrText, questionText, subjectHint),
              },
            ],
          }),
        { label: 'claude-detection' }
      )
      const detectionText =
        detectionResponse.content[0].type === 'text'
          ? detectionResponse.content[0].text
          : ''
      try {
        detection = extractJSON(detectionText) as Record<string, unknown>
      } catch {
        detection = { is_past_paper: false }
      }
    }

    let markingMode: MarkingMode = 'general_criteria'
    let markScheme: MarkSchemeRow | null = null
    let detectedPaper: Record<string, string> | null = null

    if (
      detection.is_past_paper &&
      detection.paper_code &&
      detection.paper_session &&
      detection.question_number
    ) {
      detectedPaper = {
        paper_code: String(detection.paper_code),
        paper_session: String(detection.paper_session),
        question_number: String(detection.question_number),
      }

      const lookup = await lookupMarkScheme(
        detectedPaper.paper_code,
        detectedPaper.paper_session,
        detectedPaper.question_number
      )
      markScheme = lookup.scheme
      markingMode = lookup.scheme ? lookup.mode : lookup.mode
    }

    if (markingMode === 'general_criteria' && (!questionText || questionText.trim().length < 10)) {
      return NextResponse.json(
        {
          error:
            'We could not identify this as a past paper question. Please also upload a photo of the question, or type the question text below.',
        },
        { status: 400 }
      )
    }

    const {
      markingResult,
      lineReferences,
      errorClassifications,
      resolvedTags,
      markingMode: finalMode,
    } = await markSingleQuestion({
      ocrText,
      ocrLines,
      questionText,
      markScheme,
      markingMode,
      paperCode: detectedPaper?.paper_code,
      paperSession: detectedPaper?.paper_session,
      questionNumber: detectedPaper?.question_number,
    })

    const timeSpentSeconds = Math.max(
      1,
      Math.round((Date.now() - startTime) / 1000)
    )

    const { data: attempt } = await supabaseAdmin
      .from('attempts')
      .insert({
        mark_scheme_id: markScheme?.id || null,
        source_type: finalMode === 'official_mark_scheme' ? 'past_paper' : 'other',
        user_id: userId,
        question_text: questionText || (markScheme?.question_text ?? null),
        ocr_text: ocrText,
        ai_marking: markingResult,
        marks_earned: markingResult.marks_earned,
        total_marks: markingResult.total_marks,
        syllabus_tags: resolvedTags,
        time_spent_seconds: timeSpentSeconds,
        answer_photo_url: answerPhotoUrl,
        error_classifications: errorClassifications,
        line_references: lineReferences,
      })
      .select()
      .single()

    await supabaseAdmin.from('rate_limits').upsert(
      { ip, date: today, mark_count: currentCount + 1 },
      { onConflict: 'ip,date' }
    )

    return NextResponse.json({
      marks_earned: markingResult.marks_earned,
      total_marks: markingResult.total_marks,
      ai_marking: markingResult,
      ocr_text: ocrText,
      question_text: questionText || markScheme?.question_text || null,
      marking_mode: finalMode,
      detected_paper: detectedPaper,
      attempt_id: attempt?.id,
      syllabus_tags: resolvedTags,
      answer_photo_url: answerPhotoUrl,
      line_references: lineReferences,
      error_classifications: errorClassifications,
      upload_mode: 'single_question',
    })
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
