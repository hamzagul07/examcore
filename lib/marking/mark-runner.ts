import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import Anthropic from '@anthropic-ai/sdk'
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
import { normalizeMarkingResult } from '@/lib/marking/normalize-math'
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
import { buildDetectionPrompt } from '@/lib/marking/prompts'
import { inferSubjectFromQuestionText } from '@/lib/marking/subject-inference'
import { toMarkingAIResult } from '@/lib/marking/whole-paper'
import { buildPerPageInk } from '@/lib/marking/ink-per-page'
import type { StoredPageOcr } from '@/lib/marking/whole-paper-pages'
import type {
  MarkSchemeRow,
  MarkingMode,
  UploadMode,
  QuestionMarkResult,
} from '@/lib/marking/types'
import {
  withGeminiRetry,
  withAnthropicRetry,
} from '@/lib/marking/gemini-retry'
import { buildExtractionPrompt } from '@/lib/marking/extraction-prompts'
import type { ExtractionMode } from '@/lib/marking/storage-extract'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function ocrImage(file: File, prompt: string): Promise<string> {
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

export async function ocrAnswerWithBoxes(
  file: File,
  uploadMode: UploadMode,
  subjectCode?: string
): Promise<{ full_text: string; lines: OcrLine[] }> {
  const isMath = subjectCode === '9709'
  const prompt =
    uploadMode === 'whole_paper'
      ? WHOLE_PAPER_OCR_PROMPT
      : isMath
        ? ANSWER_OCR_PROMPT_MATH
        : ANSWER_OCR_PROMPT_GENERAL
  const raw = await ocrImage(file, prompt)
  return parseOcrAnswer(raw)
}

export async function ocrAnswerBufferWithBoxes(
  buffer: Buffer,
  mimeType: string,
  subjectCode?: string
): Promise<{ full_text: string; lines: OcrLine[] }> {
  const isMath = subjectCode === '9709'
  const prompt = isMath
    ? ANSWER_OCR_PROMPT_MATH
    : ANSWER_OCR_PROMPT_GENERAL
  return ocrTextFromBuffer(buffer, mimeType, prompt)
}

export async function ocrTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  prompt: string
): Promise<{ full_text: string; lines: OcrLine[] }> {
  const base64 = buffer.toString('base64')
  const response = await withGeminiRetry(
    () =>
      genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: base64 } },
              { text: prompt },
            ],
          },
        ],
      }),
    { label: 'ocr-buffer' }
  )
  return parseOcrAnswer(response.text || '')
}

export async function uploadAnswerPhoto(
  buffer: Buffer,
  mimeType: string,
  userId: string | null
): Promise<string | null> {
  try {
    const ext = (mimeType.split('/')[1] || 'jpg').toLowerCase()
    const prefix = userId || 'anon'
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('answer-photos')
      .upload(path, buffer, {
        contentType: mimeType || 'image/jpeg',
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

export async function lookupMarkScheme(
  paperCode: string,
  paperSession: string,
  questionNumber: string,
  options?: {
    extractionMode?: ExtractionMode
    onExtracting?: () => void
  }
): Promise<{ scheme: MarkSchemeRow | null; mode: MarkingMode; wasCached: boolean }> {
  const { data: foundScheme } = await supabaseAdmin
    .from('mark_schemes')
    .select('*')
    .eq('paper_code', paperCode)
    .eq('paper_session', paperSession)
    .eq('question_number', questionNumber)
    .maybeSingle()

  if (foundScheme) {
    return {
      scheme: foundScheme as MarkSchemeRow,
      mode: 'official_mark_scheme',
      wasCached: true,
    }
  }

  options?.onExtracting?.()

  const extractionMode = options?.extractionMode ?? 'targeted'
  const extracted = await tryExtractFromStorage(
    paperCode,
    paperSession,
    questionNumber,
    storageDeps,
    {
      mode: extractionMode,
      targetQuestion: questionNumber,
    }
  )
  if (extracted) {
    return { scheme: extracted, mode: 'official_mark_scheme', wasCached: false }
  }
  return { scheme: null, mode: 'general_criteria_paper_not_in_db', wasCached: false }
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

export async function markSingleQuestion(params: {
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
  const inferredSubject = inferSubjectFromQuestionText(questionText)
  const subjectCode = parsed?.subjectCode ?? inferredSubject ?? null
  const subjectName = subjectCode
    ? SUBJECT_CODE_MAP[subjectCode] || 'A-Level'
    : 'A-Level'
  const markingStyle = markScheme
    ? resolveQuestionMarkingStyle(
        markScheme,
        paperCode || (subjectCode ? `${subjectCode}/01` : '9709/12')
      )
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

  const promptSubjectCode = subjectCode ?? inferredSubject
  const markingPrompt = buildMarkingPrompt({
    markScheme,
    markingStyle,
    ocrText,
    questionText,
    subjectName,
    subjectCode: promptSubjectCode ?? '',
    isOfficial,
  })

  const markingResult = normalizeMarkingResult(
    await runClaudeMarking(markingPrompt, maxTokensForStyle(markingStyle))
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

  const taggingSubject = subjectCode ?? inferredSubject
  const claudeTags: SyllabusCode[] = normalizeSyllabusTagsForSubject(
    taggingSubject,
    markingResult?.syllabus_tags
  )
  let resolvedTags: SyllabusCode[] = []
  const cachedTags: SyllabusCode[] = Array.isArray(markScheme?.syllabus_tags)
    ? normalizeSyllabusTagsForSubject(taggingSubject, markScheme.syllabus_tags)
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

export async function markWholePaperQuestion(params: {
  paperCode: string
  paperSession: string
  questionNumber: string
  answerText: string
  questionPages?: StoredPageOcr[]
}): Promise<QuestionMarkResult> {
  const { paperCode, paperSession, questionNumber, answerText, questionPages } =
    params
  const { scheme, mode } = await lookupMarkScheme(
    paperCode,
    paperSession,
    questionNumber,
    { extractionMode: 'full' }
  )
  const style = scheme
    ? resolveQuestionMarkingStyle(scheme, paperCode)
    : 'point_based'

  const ocrLines =
    questionPages?.flatMap((p) => p.ocr_lines) ?? []

  const { markingResult, lineReferences, resolvedTags } =
    await markSingleQuestion({
      ocrText: answerText,
      ocrLines,
      questionText: scheme?.question_text || '',
      markScheme: scheme,
      markingMode: scheme ? mode : 'general_criteria_paper_not_in_db',
      paperCode,
      paperSession,
      questionNumber,
    })

  const ai = toMarkingAIResult(markingResult)
  const pageSources =
    questionPages?.filter((p) => p.photo_url) ?? []
  const inkPages = buildPerPageInk(ai, pageSources)
  const pagePhotoUrls = pageSources.map((p) => p.photo_url).filter(Boolean)

  return {
    question_number: questionNumber,
    marks_earned: ai.marks_earned,
    total_marks: ai.total_marks,
    marking_style: style,
    summary: ai.summary,
    ai_marking: ai,
    mark_scheme_id: scheme?.id ?? null,
    line_references: lineReferences,
    answer_photo_url: pagePhotoUrls[0] ?? null,
    page_photo_urls: pagePhotoUrls.length ? pagePhotoUrls : undefined,
    ink_pages: inkPages.length ? inkPages : undefined,
    status: 'attempted' as const,
    syllabus_tags: resolvedTags.length
      ? resolvedTags
      : ai.syllabus_tags ?? scheme?.syllabus_tags ?? undefined,
  }
}

export async function markWholePaperQuestionSafe(params: {
  paperCode: string
  paperSession: string
  questionNumber: string
  answerText: string
  questionPages?: StoredPageOcr[]
}): Promise<QuestionMarkResult> {
  try {
    return await markWholePaperQuestion(params)
  } catch (err) {
    console.error(`Marking failed for Q${params.questionNumber}:`, err)
    const { scheme } = await lookupMarkScheme(
      params.paperCode,
      params.paperSession,
      params.questionNumber,
      { extractionMode: 'full' }
    )
    return {
      question_number: params.questionNumber,
      marks_earned: 0,
      total_marks: scheme?.total_marks ?? 0,
      marking_style: scheme
        ? resolveQuestionMarkingStyle(scheme, params.paperCode)
        : 'point_based',
      summary: 'Marking failed for this question.',
      status: 'marking_failed',
      error_message:
        err instanceof Error ? err.message : 'Marking failed. Please retry.',
      ai_marking: {
        marks_earned: 0,
        total_marks: scheme?.total_marks ?? 0,
        summary: 'Marking failed',
        weak_topics: [],
        what_to_study_next: '',
      },
      mark_scheme_id: scheme?.id ?? null,
    }
  }
}

export { buildDetectionPrompt, questionPhotoOcrPrompt, buildExtractionPrompt }
