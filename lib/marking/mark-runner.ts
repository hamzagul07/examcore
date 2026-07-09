import { createClient } from '@supabase/supabase-js'
import { GEMINI_FLASH_MODEL, GEMINI_PRO_MODEL, generateGeminiTextWithMeta, generateGeminiWithContents, getGeminiClient } from '@/lib/ai/gemini-text'

/**
 * Model tier for the marking JUDGEMENT call (which band, is a method valid).
 * OCR/extraction stay on Flash; the mark itself runs on Pro for accuracy.
 * Flip back to GEMINI_FLASH_MODEL here to revert the cost/latency change.
 */
const MARKING_MODEL = GEMINI_PRO_MODEL

/**
 * Second-opinion verify pass: re-mark point/criteria answers to catch under- and
 * over-marking (the main driver of run-to-run score variance on long questions).
 * Costs one extra Pro call per marked question. Set false here to disable.
 */
const VERIFY_MARKING = true
import { normalizeSyllabusTagsForSubject, type SyllabusCode } from '@/lib/syllabi'
import {
  buildLineReferences,
  type OcrLine,
} from '@/lib/examiner-ink-positioning'
import { normalizeErrorClassification } from '@/lib/error-classifications'
import { isMathSubjectCode } from '@/lib/marking/math-subjects'
import { SUBJECT_CODE_MAP } from '@/lib/profile-options'
import { parsePaperCode } from '@/lib/marking/component-types'
import { buildMarkingPrompt, maxTokensForStyle, looksLikeMcq } from '@/lib/marking/build-marking-prompt'
import { deriveMarkScheme } from '@/lib/marking/derive-scheme'
import { extractJSON } from '@/lib/marking/json'
import { normalizeQuestionNumber } from '@/lib/marking/question-number'
import { normalizeMarkingResult, coerceMarkingResult, isUsableMarkingResult } from '@/lib/marking/normalize-math'
import { reconcileMarkResult, type CriterionMax } from '@/lib/marking/reconcile-marks'
import {
  tryExtractFromStorage,
  resolveQuestionMarkingStyle,
} from '@/lib/marking/storage-extract'
import {
  ANSWER_OCR_PROMPT_MATH,
  ANSWER_OCR_PROMPT_GENERAL,
  WHOLE_PAPER_OCR_PROMPT,
  COMBINED_SCRIPT_OCR_PROMPT,
  parseOcrAnswer,
  questionPhotoOcrPrompt,
} from '@/lib/marking/ocr'
import { buildDetectionPrompt, buildVerifyMarkingPrompt } from '@/lib/marking/prompts'
import { inferSubjectFromQuestionText } from '@/lib/marking/subject-inference'
import { toMarkingAIResult } from '@/lib/marking/whole-paper'
import { buildPerPageInk } from '@/lib/marking/ink-per-page'
import type { StoredPageOcr } from '@/lib/marking/whole-paper-pages'
import { uploadAnswerPhoto as uploadAnswerPhotoToStorage } from '@/lib/storage/answer-photos'
import type {
  MarkSchemeRow,
  MarkingMode,
  MarkingStyle,
  UploadMode,
  QuestionMarkResult,
  ResolvedIbComponent,
} from '@/lib/marking/types'
import { withGeminiRetry } from '@/lib/marking/gemini-retry'
import { buildExtractionPrompt } from '@/lib/marking/extraction-prompts'
import type { ExtractionMode } from '@/lib/marking/storage-extract'
import {
  getIbMarkingProfile,
  isIbSubjectCode,
  resolveSubjectLabel,
  ibPracticeMarkingStyle,
} from '@/lib/ib/marking-config'
import { buildIbPracticeMarkScheme } from '@/lib/marking/ib-practice-scheme'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Exact DB match first, then normalized question id (e.g. "2 (a)" → "2(a)"). */
export async function findMarkSchemeRow(
  paperCode: string,
  paperSession: string,
  questionNumber: string
): Promise<MarkSchemeRow | null> {
  const trimmed = questionNumber.trim()
  if (!trimmed) return null

  const { data: exact } = await supabaseAdmin
    .from('mark_schemes')
    .select('*')
    .eq('paper_code', paperCode)
    .eq('paper_session', paperSession)
    .eq('question_number', trimmed)
    .maybeSingle()

  if (exact) return exact as MarkSchemeRow

  const target = normalizeQuestionNumber(trimmed)
  const { data: rows } = await supabaseAdmin
    .from('mark_schemes')
    .select('*')
    .eq('paper_code', paperCode)
    .eq('paper_session', paperSession)

  const match = (rows ?? []).find(
    (row) => normalizeQuestionNumber(String(row.question_number ?? '')) === target
  )
  return (match as MarkSchemeRow | undefined) ?? null
}

export function getMarkingGenAI() {
  return getGeminiClient()
}

export async function ocrImage(file: File, prompt: string): Promise<string> {
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
    { task: 'ocr', model: GEMINI_FLASH_MODEL, temperature: 0 }
  )
  return response.text || ''
}

export async function ocrAnswerWithBoxes(
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

export async function ocrAnswerBufferWithBoxes(
  buffer: Buffer,
  mimeType: string,
  subjectCode?: string,
  /** Combined script (question + working in one image) — capture BOTH so
   * multi-question detection has the question text to work with. */
  combined?: boolean
): Promise<{ full_text: string; lines: OcrLine[] }> {
  const isMath = isMathSubjectCode(subjectCode)
  const prompt = combined
    ? COMBINED_SCRIPT_OCR_PROMPT
    : isMath
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
  const response = await generateGeminiWithContents(
    [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: prompt },
        ],
      },
    ],
    { task: 'ocr', model: GEMINI_FLASH_MODEL, temperature: 0 }
  )
  return parseOcrAnswer(response.text || '')
}

export async function uploadAnswerPhoto(
  buffer: Buffer,
  mimeType: string,
  userId: string | null
): Promise<string | null> {
  return uploadAnswerPhotoToStorage(buffer, mimeType, userId)
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
        getMarkingGenAI().models.generateContent({
          model: GEMINI_FLASH_MODEL,
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
  ) => findMarkSchemeRow(paperCode, paperSession, questionNumber),
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
  const foundScheme = await findMarkSchemeRow(paperCode, paperSession, questionNumber)

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

/** Thrown when Gemini output cannot be parsed into a usable marking payload. */
export class MarkingParseError extends Error {
  readonly name = 'MarkingParseError'

  constructor(
    message = 'We could not read the marking result. Please try again.'
  ) {
    super(message)
  }
}

function parseMarkingResponse(markingText: string): Record<string, unknown> {
  if (!markingText.trim()) {
    throw new SyntaxError('Empty marking model response')
  }
  const parsed = coerceMarkingResult(
    extractJSON(markingText) as Record<string, unknown>
  )
  if (!isUsableMarkingResult(parsed)) {
    throw new SyntaxError('Marking payload missing required fields')
  }
  return parsed
}

function buildMarkingJsonRepairPrompt(
  originalPrompt: string,
  rawResponse: string
): string {
  return `A marking model was given this prompt:

${originalPrompt.slice(0, 6000)}

It replied with invalid or incomplete JSON:

---
${rawResponse.slice(0, 4000)}
---

Repair the reply into valid JSON for a Cambridge mark scheme result. Include at least one of:
- "marks_awarded": array of mark objects (type, awarded, reasoning, etc.)
- "marks_earned" and "total_marks" numbers
- "band_result" object (for essay-style questions)
- "summary" string (at least 10 characters)

Return ONLY the JSON object — no markdown fences or explanation.`
}

async function runGeminiMarking(
  prompt: string,
  maxTokens: number
): Promise<Record<string, unknown>> {
  const tokenBudgets = [
    maxTokens,
    // Escalation headroom on a truncated/incomplete first attempt. Ceiling sized
    // for large multi-part results marked on Pro (whose thinking tokens also draw
    // from this budget), so summary/weak_topics don't get truncated away.
    Math.min(Math.round(maxTokens * 2), 24576),
  ]
  let lastText = ''
  // A MAX_TOKENS finish that still parses (extractJSON salvages the braces)
  // silently drops every field after the truncation point — summary,
  // weak_topics, what_to_study_next, marking_style. Keep the best salvage so
  // we can escalate the budget yet still return *something* if all retries
  // also truncate.
  let salvaged: Record<string, unknown> | null = null

  for (let attempt = 0; attempt < tokenBudgets.length; attempt++) {
    const { text, finishReason } = await generateGeminiTextWithMeta(prompt, {
      task: 'marking',
      model: MARKING_MODEL,
      maxOutputTokens: tokenBudgets[attempt],
      temperature: 0,
    })
    lastText = text

    if (!text.trim()) {
      console.warn('[marking] empty model response', {
        attempt: attempt + 1,
        finishReason,
      })
      continue
    }

    const hasMoreBudget = attempt < tokenBudgets.length - 1
    let parsed: Record<string, unknown> | null = null
    try {
      parsed = parseMarkingResponse(text)
    } catch (parseErr) {
      console.error(
        '[marking] JSON parse failed:',
        {
          attempt: attempt + 1,
          finishReason,
          snippet: text.slice(0, 400),
        },
        parseErr
      )
      if (finishReason === 'MAX_TOKENS' && hasMoreBudget) {
        continue
      }
    }

    if (parsed) {
      // Truncated-but-salvageable: retry with the larger budget rather than
      // return feedback with blank summary / undefined marking_style.
      if (finishReason === 'MAX_TOKENS' && hasMoreBudget) {
        console.warn('[marking] truncated result, retrying with larger budget', {
          attempt: attempt + 1,
          budget: tokenBudgets[attempt],
        })
        salvaged = salvaged ?? parsed
        continue
      }
      return parsed
    }
  }

  // Every attempt truncated but at least one salvaged — prefer real marks
  // (with blank trailing feedback) over a lossy repair round-trip.
  if (salvaged) return salvaged

  try {
    const repairPrompt = buildMarkingJsonRepairPrompt(prompt, lastText)
    const { text: repairedText } = await generateGeminiTextWithMeta(
      repairPrompt,
      {
        task: 'json-repair-retry',
        temperature: 0,
        maxOutputTokens: tokenBudgets[tokenBudgets.length - 1],
      }
    )
    return parseMarkingResponse(repairedText)
  } catch (secondErr) {
    console.error(
      '[marking] JSON repair failed:',
      lastText.slice(0, 400),
      secondErr
    )
    throw new MarkingParseError()
  }
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
  /** M1: resolved IB catalog component; when a points component, drives the prompt. */
  resolvedIb?: ResolvedIbComponent | null
  /** Optional student-supplied total marks for this question. */
  questionTotalMarks?: number | null
  /** Run the second-opinion verify pass. Default true; large multi-question
   * batches pass false to stay under the function timeout. */
  verify?: boolean
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
    resolvedIb,
    questionTotalMarks,
    verify = true,
  } = params

  let markingMode = initialMode

  const parsed = paperCode ? parsePaperCode(paperCode) : null
  const inferredSubject = inferSubjectFromQuestionText(questionText)
  const rawSubjectCode =
    initialMode === 'general_criteria_practice' && parsed?.subjectCode
      ? parsed.subjectCode
      : parsed?.subjectCode ?? inferredSubject ?? null
  const ibProfile = rawSubjectCode ? getIbMarkingProfile(rawSubjectCode) : null
  const subjectCode = rawSubjectCode
  const subjectName = subjectCode
    ? resolveSubjectLabel(subjectCode) !== subjectCode
      ? resolveSubjectLabel(subjectCode)
      : SUBJECT_CODE_MAP[subjectCode] || subjectCode
    : 'A-Level'

  let effectiveMarkScheme = markScheme
  let markingStyle: MarkingStyle =
    markScheme
      ? resolveQuestionMarkingStyle(
          markScheme,
          paperCode || (subjectCode ? `${subjectCode}/01` : '9709/12')
        )
      : ibProfile
        ? ibProfile.practiceStyle
        : isIbSubjectCode(subjectCode ?? '')
          ? ibPracticeMarkingStyle(subjectCode!)
          : 'point_based'

  if (
    markingMode === 'general_criteria_practice' &&
    !effectiveMarkScheme &&
    ibProfile
  ) {
    effectiveMarkScheme = buildIbPracticeMarkScheme(ibProfile, questionText)
    markingStyle = ibProfile.practiceStyle
  }

  const isOfficial = markingMode === 'official_mark_scheme' && !!effectiveMarkScheme

  if (markingMode === 'general_criteria' && subjectCode === '9709') {
    // preserve legacy math general path
  } else if (
    markingMode === 'general_criteria_practice' && subjectCode === '9709') {
    // same 9709 general path for practice questions
  } else if (
    markingMode === 'general_criteria_paper_not_in_db' &&
    !questionText.trim()
  ) {
    markingMode = 'general_criteria'
  }

  // M1/M3: a catalogued IB component marks with the style its assessment model
  // implies, regardless of the subject's default practice style (affects the
  // token budget + the fallback marking_style).
  if (resolvedIb?.assessmentModel === 'points') {
    markingStyle = 'point_based'
  } else if (resolvedIb?.assessmentModel === 'criteria') {
    markingStyle = 'level_of_response'
  }

  // Derive-then-mark: for point-based questions with no real per-question scheme,
  // first have the model produce the scheme (correct answer + M/A allocation, with
  // a self-check), then mark the student against it. Skips MCQ and any question
  // that already has an official/catalogued scheme.
  let derivedScheme: string | null = null
  let derivedTotal: number | null = null
  const hasRealScheme =
    (isOfficial && !!effectiveMarkScheme) || resolvedIb?.officialScheme != null
  if (
    markingStyle === 'point_based' &&
    !hasRealScheme &&
    !looksLikeMcq(questionText) &&
    questionText.trim().length >= 8
  ) {
    const isIbBoard =
      !!resolvedIb || isIbSubjectCode(subjectCode ?? '')
    const derived = await deriveMarkScheme({
      subjectName,
      board: isIbBoard ? 'IB Diploma' : 'Cambridge',
      questionText,
      totalMarks:
        typeof questionTotalMarks === 'number' && questionTotalMarks > 0
          ? questionTotalMarks
          : null,
      mathConventions:
        isMathSubjectCode(subjectCode ?? '') || /math/i.test(subjectName),
    })
    if (derived) {
      derivedScheme = JSON.stringify(derived.scheme)
      derivedTotal = derived.total
    }
  }

  const promptSubjectCode = subjectCode ?? inferredSubject
  const markingPrompt = buildMarkingPrompt({
    markScheme: effectiveMarkScheme,
    markingStyle,
    ocrText,
    questionText,
    subjectName,
    subjectCode: promptSubjectCode ?? '',
    isOfficial,
    resolvedIb,
    questionTotalMarks: questionTotalMarks ?? derivedTotal,
    derivedScheme,
  })

  // Authoritative denominator — resolved in code, never trusted from the model.
  // Priority: official scheme total → catalogued IB component/criteria max →
  // student-supplied total. Null when genuinely unknown (falls back to breakdown).
  const criterionMax: CriterionMax[] | null =
    resolvedIb?.assessmentModel === 'criteria' && resolvedIb.criteria?.length
      ? resolvedIb.criteria.map((c) => ({ letter: c.letter, maxMarks: c.maxMarks }))
      : null

  const schemeTotal =
    effectiveMarkScheme &&
    typeof effectiveMarkScheme.total_marks === 'number' &&
    effectiveMarkScheme.total_marks > 0
      ? effectiveMarkScheme.total_marks
      : null
  // Only a CRITERIA component carries a per-submission total (e.g. an IA out of
  // 20). A POINTS component's maxMarks is the WHOLE PAPER (e.g. Paper 2 = 80) —
  // never a single question's denominator — so we must not use it here. For a
  // single points question the per-question total (student-supplied or detected)
  // or the derived total is authoritative instead.
  const catalogTotal = criterionMax
    ? criterionMax.reduce((sum, c) => sum + c.maxMarks, 0)
    : null
  const studentTotal =
    typeof questionTotalMarks === 'number' && questionTotalMarks > 0
      ? questionTotalMarks
      : null
  const authoritativeTotal =
    schemeTotal ?? catalogTotal ?? studentTotal ?? derivedTotal ?? null

  let markingResult = reconcileMarkResult(
    normalizeMarkingResult(
      await runGeminiMarking(markingPrompt, maxTokensForStyle(markingStyle))
    ),
    { authoritativeTotal, criterionMax }
  )

  // Second-opinion verify pass — re-mark to correct under/over-marking (the main
  // cause of run-to-run score variance). Points + level_of_response only; MCQ is
  // deterministic. Failures fall back to the first-pass result.
  const hasBreakdown =
    (Array.isArray(markingResult.marks_awarded) &&
      markingResult.marks_awarded.length > 0) ||
    Array.isArray(markingResult.criteria_results) ||
    !!markingResult.band_result
  if (
    VERIFY_MARKING &&
    verify &&
    (markingStyle === 'point_based' || markingStyle === 'level_of_response') &&
    hasBreakdown
  ) {
    try {
      const verifyBoard =
        !!resolvedIb || isIbSubjectCode(subjectCode ?? '') ? 'IB Diploma' : 'Cambridge'
      const verifySchemeJson =
        derivedScheme ??
        (resolvedIb?.officialScheme != null
          ? JSON.stringify(resolvedIb.officialScheme)
          : null) ??
        (effectiveMarkScheme
          ? JSON.stringify(effectiveMarkScheme.mark_scheme)
          : null)
      const verifyPrompt = buildVerifyMarkingPrompt({
        subjectName,
        board: verifyBoard,
        questionText: questionText || effectiveMarkScheme?.question_text || '',
        ocrText,
        schemeJson: verifySchemeJson,
        priorResultJson: JSON.stringify(markingResult),
        totalMarks: authoritativeTotal,
      })
      const verified = reconcileMarkResult(
        normalizeMarkingResult(
          await runGeminiMarking(verifyPrompt, maxTokensForStyle(markingStyle))
        ),
        { authoritativeTotal, criterionMax }
      )
      if (isUsableMarkingResult(verified)) {
        markingResult = verified
      }
    } catch (err) {
      console.warn('[mark] verify pass failed; keeping first-pass result', err)
    }
  }

  // The model echoes marking_style in its JSON, but a truncated response can
  // drop it. Fall back to the style we actually marked with so downstream UI
  // never sees an undefined style.
  if (typeof markingResult.marking_style !== 'string' || !markingResult.marking_style) {
    markingResult.marking_style = markingStyle
  }

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
  const modelTags: SyllabusCode[] = normalizeSyllabusTagsForSubject(
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
      resolvedTags = modelTags
      if (resolvedTags.length > 0 && markScheme.id) {
        await supabaseAdmin
          .from('mark_schemes')
          .update({ syllabus_tags: resolvedTags })
          .eq('id', markScheme.id)
      }
    }
  } else {
    resolvedTags = modelTags
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
