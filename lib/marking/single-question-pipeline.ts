import { createClient } from '@supabase/supabase-js'
import { generateGeminiText } from '@/lib/ai/gemini-text'
import { SUBJECT_CODE_MAP } from '@/lib/profile-options'
import type { OcrLine } from '@/lib/examiner-ink-positioning'
import { extractJSON } from '@/lib/marking/json'
import {
  stagePercent,
  type MarkContextPayload,
  type MarkProgressEvent,
} from '@/lib/marking/mark-progress'
import { isRequestDeadlineError } from '@/lib/ai/request-deadline'
import {
  lookupMarkScheme,
  markSingleQuestion,
  ocrAnswerBufferWithBoxes,
  uploadAnswerPhoto,
  ocrImage,
  questionPhotoOcrPrompt,
  getMarkingGenAI,
} from '@/lib/marking/mark-runner'
import { ocrPdfToPages, ocrPdfToPlainText } from '@/lib/marking/pdf-pages'
import { buildDetectionPrompt } from '@/lib/marking/prompts'
import { reconcileDetectionWithQuestion } from '@/lib/marking/subject-inference'
import { resolveMarkResultSubjectCode } from '@/lib/syllabi/attempts'
import {
  buildAllPageInk,
  type PageInkSource,
} from '@/lib/marking/ink-per-page'
import { dropDuplicateAdjacentPages } from '@/lib/marking/dedupe-pages'
import { extractMarkSchemeRubric } from '@/lib/marking/mark-scheme-display'
import { toMarkingAIResult, aggregateWholePaperResults } from '@/lib/marking/whole-paper'
import { extractPracticeQuestionFromScript } from '@/lib/marking/practice-question-extract'
import { splitUploadIntoQuestions, type SplitQuestion } from '@/lib/marking/split-questions'
import { extractStatedTotalMarks } from '@/lib/marking/question-marks'
import type {
  MarkIntent,
  MarkingMode,
  MarkSchemeRow,
  QuestionMarkResult,
  ResolvedIbComponent,
} from '@/lib/marking/types'
import { coerceMarkingStyle } from '@/lib/marking/types'
import {
  resolveComponentForMarking,
  splitLegacyIbCode,
  normalizeIbQuestionNumber,
  type IbSelectableLevel,
} from '@/lib/ib/assessment-catalog'

/** For a points component, attach the official markpoints for THIS question
 * (if ingested) so the marker uses the real scheme instead of a derived one. */
function resolvedIbForQuestion(
  ib: ResolvedIbComponent | null,
  questionNumber: string
): ResolvedIbComponent | null {
  if (
    !ib ||
    ib.assessmentModel !== 'points' ||
    !ib.officialSchemesByQuestion
  ) {
    return ib
  }
  const scheme = ib.officialSchemesByQuestion[normalizeIbQuestionNumber(questionNumber)]
  return scheme ? { ...ib, officialScheme: scheme } : ib
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function isPdfFile(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

async function ocrQuestionFile(
  file: File,
  subjectHint?: string
): Promise<string> {
  if (isPdfFile(file)) {
    return ocrPdfToPlainText(
      await file.arrayBuffer(),
      getMarkingGenAI(),
      questionPhotoOcrPrompt(subjectHint)
    )
  }
  return ocrImage(file, questionPhotoOcrPrompt(subjectHint))
}

export type SingleQuestionMarkInput = {
  pageFiles: File[]
  answerPdf: File | null
  questionPhoto: File | null
  questionTextInput: string
  manualPaperCode: string | null
  manualPaperSession: string | null
  manualQuestionNumber: string | null
  /** When `practice_question`, skips past-paper detection and uses subject conventions. */
  markIntent?: MarkIntent
  practiceSubjectCode?: string | null
  /**
   * Subject the user selected in the UI, forwarded even when they didn't pick a
   * full paper (year/session/component). Used only as a last-resort tagging
   * subject when no paper code is detected — so freeform "mark my work" attempts
   * still resolve a subject and feed mastery/review instead of saving untagged.
   */
  fallbackSubjectCode?: string | null
  /** M1: IB selection axes. When set + catalogued, drives catalog-based marking. */
  ibComponentKey?: string | null
  ibLevel?: string | null
  /** Optional student-supplied total marks for this question. */
  questionMarks?: number | null
  userId: string | null
  /**
   * Paid entitlement for this mark. Drives premium marking depth — currently the
   * second-opinion verify pass runs on the FULL script for paid users, where free
   * users skip it on large multi-question batches to stay under the function
   * timeout. Defaults false (free/guest).
   */
  isPaid?: boolean
  /**
   * Premium: generate the full-marks rewrite (single-question path only). Gated
   * separately from `isPaid` so it can be re-tiered (e.g. Scholar+) without
   * changing the verify-depth behaviour. Defaults false.
   */
  enableRewrite?: boolean
  /**
   * Return the premium rewrite as a plan (on `_rewrite_plan`) instead of
   * generating it inline. Set by the streaming caller, which sends the marks
   * immediately and then fills the rewrite in with a follow-up event.
   */
  deferRewrite?: boolean
  startedAt?: number
  onProgress?: (event: MarkProgressEvent) => void
}

function emit(
  onProgress: SingleQuestionMarkInput['onProgress'],
  stage: Extract<MarkProgressEvent, { type: 'progress' }>['stage'],
  /** Override only where a stage reports sub-progress (per-question batches);
   * otherwise the canonical percent for the stage is used. */
  percent?: number
) {
  onProgress?.({ type: 'progress', stage, percent: percent ?? stagePercent(stage) })
}

function emitContext(
  onProgress: SingleQuestionMarkInput['onProgress'],
  ctx: MarkContextPayload
) {
  onProgress?.({ type: 'context', ...ctx })
}

/** Resolve an IB catalog component for a practice upload (shared by single + multi paths). */
async function resolvePracticeIb(
  practiceCode: string,
  ibComponentKey: string | null | undefined,
  ibLevel: string | null | undefined
): Promise<ResolvedIbComponent | null> {
  if (!practiceCode.startsWith('ib-') || !ibComponentKey) return null
  const { subjectCode: catSubject, level: legacyLevel } =
    splitLegacyIbCode(practiceCode)
  const rawLevel = (ibLevel?.trim().toUpperCase() || legacyLevel) as
    | IbSelectableLevel
    | null
  if (rawLevel !== 'HL' && rawLevel !== 'SL') return null
  try {
    return await resolveComponentForMarking(catSubject, rawLevel, ibComponentKey.trim())
  } catch (err) {
    console.warn('[mark] IB catalog resolve failed; using fallback', err)
    return null
  }
}

/** Cap on questions marked from one scanned script — bounds cost, latency, and
 * the risk of blowing the 300s function timeout (each question is 2 Gemini Pro
 * calls). Kept in line with the whole-paper path's 15-question cap. */
const MAX_SPLIT_QUESTIONS = 15
/** Tighter cap for signed-out users: a guest's whole upload only counts as one
 * anonymous rate-limit tick, so bound the Pro spend it can trigger (L2). */
const GUEST_MAX_SPLIT_QUESTIONS = 3
/** Concurrent per-question marks. Each question fans out to derive + mark on Pro,
 * so keep this modest to respect model rate limits while cutting wall-clock. */
const SPLIT_CONCURRENCY = 3
/** Run the (expensive) second-opinion verify pass per question only when the
 * batch is small enough to finish within the function timeout. Larger scripts
 * skip verify — a full batch of 3 Pro calls/question would risk a 300s timeout;
 * completing every question reliably matters more than the last ~1 mark of
 * precision on a big script. Single-question marks always verify (not a batch). */
const VERIFY_MAX_BATCH = 3

/** Run `fn` over `items` with a bounded number of concurrent workers, preserving
 * input order in the results array. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  )
  return results
}

type SplitQuestionOutcome = {
  result: QuestionMarkResult
  attemptId: string | null
  tags: string[]
}

/** Build a zero-score placeholder result (unattempted / failed) that renders in
 * the whole-paper view without a persisted attempt or a billed mark. */
function placeholderQuestionResult(
  q: SplitQuestion,
  status: 'unattempted' | 'marking_failed',
  summary: string,
  answerPhotoUrl: string | null,
  errorMessage?: string
): QuestionMarkResult {
  const total = q.total_marks && q.total_marks > 0 ? q.total_marks : 0
  return {
    question_number: q.question_number,
    marks_earned: 0,
    total_marks: total,
    marking_style: 'point_based',
    summary,
    ai_marking: {
      marks_earned: 0,
      total_marks: total,
      summary,
      weak_topics: [],
      what_to_study_next: '',
    },
    status,
    error_message: errorMessage,
    mark_scheme_id: null,
    answer_photo_url: answerPhotoUrl,
  }
}

/** Mark a single detected question in isolation: unanswered → "not attempted"
 * (H1, never mark the stem as the answer); marking error → "marking_failed" (H2,
 * one bad question never sinks the batch). */
async function markOneSplitQuestion(
  q: SplitQuestion,
  ctx: {
    practiceCode: string
    resolvedIb: ResolvedIbComponent | null
    userId: string | null
    answerPhotoUrl: string | null
    startedAt: number
    fullScriptText: string
    pageSources: PageInkSource[]
    verify: boolean
  }
): Promise<SplitQuestionOutcome> {
  // H1: never mark the question STEM as the answer. When the per-question answer
  // extraction comes back empty (it is unreliable), fall back to the FULL script
  // and let the marker localise this question's working — far safer than scoring a
  // correct answer 0. A genuinely blank question then simply earns ~0 (no working
  // for it exists in the script).
  const answerText =
    q.answer_text && q.answer_text.trim().length >= 3
      ? q.answer_text
      : ctx.fullScriptText

  try {
    const { markingResult, lineReferences, errorClassifications, resolvedTags } =
      await markSingleQuestion({
        ocrText: answerText,
        ocrLines: [],
        questionText: q.question_text,
        markScheme: null,
        markingMode: 'general_criteria_practice',
        paperCode: `${ctx.practiceCode}/00`,
        resolvedIb: resolvedIbForQuestion(ctx.resolvedIb, q.question_number),
        questionTotalMarks: q.total_marks,
        verify: ctx.verify,
      })

    const ai = toMarkingAIResult(markingResult)
    // Per-question examiner-ink: match this question's marks against every page's
    // OCR lines — each mark's quoted working lands on the page it's actually on,
    // so ink maps to the right pages without splitting the OCR lines per question.
    // Keeps every page (empty ink where none) so the full script re-renders.
    const inkPages = buildAllPageInk(ai, ctx.pageSources)
    const pagePhotoUrls = ctx.pageSources
      .map((p) => p.photo_url)
      .filter((u): u is string => !!u)
    const timeSpent = Math.max(1, Math.round((Date.now() - ctx.startedAt) / 1000))
    const { data: attempt } = await supabaseAdmin
      .from('attempts')
      .insert({
        mark_scheme_id: null,
        source_type: 'other',
        user_id: ctx.userId,
        question_text: q.question_text || null,
        ocr_text: answerText,
        ai_marking:
          inkPages.length > 0
            ? { ...markingResult, page_photo_urls: pagePhotoUrls, ink_pages: inkPages }
            : markingResult,
        marks_earned: ai.marks_earned,
        total_marks: ai.total_marks,
        syllabus_tags: resolvedTags,
        time_spent_seconds: timeSpent,
        answer_photo_url: ctx.answerPhotoUrl,
        error_classifications: errorClassifications,
        line_references: lineReferences,
      })
      .select()
      .single()

    return {
      result: {
        question_number: q.question_number,
        marks_earned: ai.marks_earned,
        total_marks: ai.total_marks,
        marking_style: coerceMarkingStyle(ai.marking_style, 'point_based'),
        summary: ai.summary,
        ai_marking: ai,
        status: 'attempted',
        mark_scheme_id: null,
        line_references: lineReferences,
        answer_photo_url: ctx.answerPhotoUrl,
        ink_pages: inkPages.length ? inkPages : undefined,
        syllabus_tags: resolvedTags,
      },
      attemptId: attempt?.id ?? null,
      tags: resolvedTags,
    }
  } catch (err) {
    // Budget exhaustion is NOT a per-question failure — it means the whole run
    // is out of time. Swallowing it here let the remaining questions each burn
    // another doomed attempt and, worse, let the route settle the run as a
    // success while half the questions read "marking failed". Propagate so the
    // route classifies it, releases the reservation and records a real error.
    if (isRequestDeadlineError(err)) throw err
    // H2: isolate the failure so the other questions still return.
    console.error(`[mark] split question ${q.question_number} failed:`, err)
    return {
      result: placeholderQuestionResult(
        q,
        'marking_failed',
        'Marking failed for this question — please try re-uploading it on its own.',
        ctx.answerPhotoUrl,
        err instanceof Error ? err.message : 'Marking failed'
      ),
      attemptId: null,
      tags: [],
    }
  }
}

/**
 * Multi-question path: mark each detected question separately and return a
 * whole-paper-shaped payload so the existing per-question UI renders it. Each
 * question runs through the full single-question marker (derive-then-mark +
 * deterministic reconciliation), and gets its own persisted attempt.
 */
async function markSplitQuestions(params: {
  split: SplitQuestion[]
  practiceCode: string
  resolvedIb: ResolvedIbComponent | null
  userId: string | null
  isPaid: boolean
  answerPhotoUrl: string | null
  pagePhotoUrls: string[]
  startedAt: number
  fullScriptText: string
  pageSources: PageInkSource[]
  onProgress?: SingleQuestionMarkInput['onProgress']
}): Promise<Record<string, unknown>> {
  const {
    split,
    practiceCode,
    resolvedIb,
    userId,
    isPaid,
    answerPhotoUrl,
    pagePhotoUrls,
    startedAt,
    fullScriptText,
    pageSources,
    onProgress,
  } = params

  // H3/L2: cap the number of questions so one upload can't fan out into an
  // unbounded run of Pro calls (timeout risk) — and a tighter cap for guests,
  // whose whole upload is a single anonymous rate-limit tick.
  const cap = userId ? MAX_SPLIT_QUESTIONS : GUEST_MAX_SPLIT_QUESTIONS
  const capped = split.slice(0, cap)
  const droppedCount = split.length - capped.length
  if (droppedCount > 0) {
    console.warn(
      `[mark] scanned script had ${split.length} questions; marking first ${cap}`
    )
  }

  // Tell the loading UI this is a multi-question script (drives "marking N
  // questions…" copy) before the per-question work starts.
  emitContext(onProgress, {
    subject_code: practiceCode,
    total_questions: capped.length,
  })

  // Verify pass: free/guest scripts skip it above VERIFY_MAX_BATCH to stay under
  // the function timeout. Paid users get the second-opinion pass on the FULL
  // script (premium marking depth) — the route runs on Fluid Compute with a much
  // larger maxDuration, so the extra Pro calls have headroom.
  const verify = isPaid || capped.length <= VERIFY_MAX_BATCH
  if (!verify) {
    console.warn(
      `[mark] ${capped.length} questions > ${VERIFY_MAX_BATCH}; skipping verify pass to stay under the function timeout`
    )
  }

  // Mark each question in isolation, with bounded concurrency (H2 + H3).
  let completed = 0
  const outcomes = await mapWithConcurrency(capped, SPLIT_CONCURRENCY, async (q) => {
    const outcome = await markOneSplitQuestion(q, {
      practiceCode,
      resolvedIb,
      userId,
      answerPhotoUrl,
      startedAt,
      fullScriptText,
      verify,
      pageSources,
    })
    completed += 1
    emit(onProgress, 'marking', Math.round(50 + (45 * completed) / capped.length))
    return outcome
  })

  const questionResults = outcomes.map((o) => o.result)
  const attemptIds = outcomes
    .map((o) => o.attemptId)
    .filter((id): id is string => !!id)
  const allTags = new Set<string>(outcomes.flatMap((o) => o.tags))

  emit(onProgress, 'marking', 95)

  const whole = aggregateWholePaperResults(undefined, undefined, questionResults)
  if (droppedCount > 0) {
    whole.summary += ` Note: only the first ${cap} of ${split.length} detected questions were marked — re-upload the rest separately.`
  }
  const subject_code = resolveMarkResultSubjectCode({
    paper_code: `${practiceCode}/00`,
    subject_code: practiceCode,
    syllabus_tags: [...allTags],
  })

  if (userId && attemptIds.length > 0) {
    const { isCommunityEnabled } = await import('@/lib/community/enabled')
    if (isCommunityEnabled()) {
      const { awardMarkingXp } = await import('@/lib/community/feed')
      await awardMarkingXp(userId, subject_code, attemptIds[0])
    }
  }

  return {
    upload_mode: 'whole_paper',
    multi_question: true,
    whole_paper: whole,
    marks_earned: whole.marks_earned,
    total_marks: whole.total_marks,
    subject_code,
    attempt_id: attemptIds[0] ?? null,
    // All persisted attempt ids (one per question) — the route charges one mark
    // per question using these.
    question_attempt_ids: attemptIds,
    question_count: capped.length,
    answer_photo_url: answerPhotoUrl,
    page_photo_urls: pagePhotoUrls.length ? pagePhotoUrls : undefined,
    marking_mode: 'general_criteria_practice',
    syllabus_tags: [...allTags],
    time_spent_seconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
  }
}

async function runPaperDetection(
  ocrSnippet: string,
  questionText: string,
  subjectHint?: string
): Promise<Record<string, unknown>> {
  const detectionText = await generateGeminiText(
    buildDetectionPrompt(ocrSnippet, questionText, subjectHint),
    { task: 'structured-extraction', maxOutputTokens: 500, temperature: 0 }
  )
  try {
    return extractJSON(detectionText) as Record<string, unknown>
  } catch {
    return { is_past_paper: false }
  }
}

export async function runSingleQuestionMark(
  input: SingleQuestionMarkInput
): Promise<Record<string, unknown>> {
  const {
    pageFiles,
    answerPdf,
    questionPhoto,
    questionTextInput,
    manualPaperCode,
    manualPaperSession,
    manualQuestionNumber,
    markIntent = 'past_paper',
    practiceSubjectCode,
    fallbackSubjectCode,
    ibComponentKey,
    ibLevel,
    questionMarks,
    userId,
    isPaid = false,
    enableRewrite = false,
    deferRewrite = false,
    startedAt = Date.now(),
    onProgress,
  } = input

  const isCombinedScript = markIntent === 'combined_script'
  const isPracticeQuestion =
    markIntent === 'practice_question' || isCombinedScript
  const practiceCode = practiceSubjectCode?.trim() || null
  let resolvedIb: ResolvedIbComponent | null = null

  const hasManualSelection =
    !isPracticeQuestion &&
    !!(
      manualPaperCode &&
      manualPaperSession &&
      manualQuestionNumber
    )
  const manualSubjectCode = manualPaperCode?.split('/')[0]

  emit(onProgress, 'reading_work')

  const pageOcrResults: Array<{
    full_text: string
    lines: OcrLine[]
    photo_url: string | null
  }> = []

  const ocrOnePage = async (file: File) => {
    const buf = Buffer.from(await file.arrayBuffer())
    const [{ full_text, lines }, photo_url] = await Promise.all([
      ocrAnswerBufferWithBoxes(
        buf,
        file.type || 'image/jpeg',
        isCombinedScript ? practiceCode ?? undefined : manualSubjectCode,
        isCombinedScript
      ),
      uploadAnswerPhoto(buf, file.type || 'image/jpeg', userId),
    ])
    return { full_text, lines, photo_url }
  }

  const subjectHint =
    (isPracticeQuestion ? practiceCode : manualSubjectCode)
      ? SUBJECT_CODE_MAP[isPracticeQuestion ? practiceCode! : manualSubjectCode!]
      : undefined

  // The question photo is independent of the answer pages, so start reading it
  // now and collect it below. Run serially it added 5–10s to every upload that
  // used one. Settled (never raw-rejected) so a failure here can't surface as an
  // unhandled rejection while the answer OCR is still in flight.
  const questionOcrTask: Promise<
    { ok: true; text: string } | { ok: false; error: unknown }
  > | null =
    questionPhoto && !questionTextInput.trim()
      ? ocrQuestionFile(questionPhoto, subjectHint).then(
          (text) => ({ ok: true as const, text }),
          (error: unknown) => ({ ok: false as const, error })
        )
      : null

  if (answerPdf?.size) {
    const pdfPages = await ocrPdfToPages(
      await answerPdf.arrayBuffer(),
      getMarkingGenAI()
    )
    for (const p of pdfPages) {
      pageOcrResults.push({
        full_text: p.full_text,
        lines: p.lines,
        photo_url: null,
      })
    }
  } else if (pageFiles.length > 0) {
    // OCR pages with bounded concurrency (was sequential) — a multi-page image
    // upload is a big chunk of wall-clock, and with the verify pass the whole
    // mark must stay well under the 300s function limit. Order is preserved.
    const ocred = await mapWithConcurrency(pageFiles, 4, (file) => ocrOnePage(file))
    pageOcrResults.push(...ocred)
  } else {
    throw new Error('Upload at least one page of your answer.')
  }

  // Drop adjacent near-duplicate pages (same sheet photographed/OCR'd twice) so
  // we don't mark — or bill Gemini for — the same page again, and don't persist
  // a duplicate page image.
  const deduped = dropDuplicateAdjacentPages(pageOcrResults, (i, sim) =>
    console.warn(
      `[mark] dropped duplicate answer page ${i + 1} (similarity ${sim.toFixed(2)})`
    )
  )
  if (deduped.length !== pageOcrResults.length) {
    pageOcrResults.length = 0
    pageOcrResults.push(...deduped)
  }

  emit(onProgress, 'reading_work')

  const ocrText = pageOcrResults
    .map((p, i) => `[Page ${i + 1}]\n${p.full_text}`)
    .join('\n\n')
  const ocrLines = pageOcrResults.flatMap((p) => p.lines)
  const answerPhotoUrl = pageOcrResults[0]?.photo_url ?? null
  const pagePhotoUrls = pageOcrResults
    .map((p) => p.photo_url)
    .filter((u): u is string => !!u)

  if (!ocrText || ocrText.trim().length < 5) {
    throw new Error(
      "We couldn't read any answer in your photo. Upload a clear photo of your written working (a blank or unreadable page can't be marked)."
    )
  }

  let questionText = questionTextInput.trim()
  if (questionOcrTask) {
    const outcome = await questionOcrTask
    // Rethrow here rather than at kick-off time so the failure still reaches the
    // caller's classifier with the same message it had when this ran serially.
    if (!outcome.ok) throw outcome.error
    questionText = outcome.text
  }

  emit(onProgress, 'finding_scheme')

  let markingMode: MarkingMode = 'general_criteria'
  let markScheme: MarkSchemeRow | null = null
  let detectedPaper: Record<string, string> | null = null
  let ocrTextForMarking = ocrText

  if (isPracticeQuestion) {
    if (!practiceCode) {
      throw new Error('Please select a subject for your question.')
    }

    if (!isCombinedScript) {
      if (!questionText || questionText.trim().length < 10) {
        throw new Error(
          'Add your question — type it or upload a photo — before we can mark your answer.'
        )
      }
    }

    emit(onProgress, 'finding_scheme')

    // Multi-question guard: a combined script can hold several distinct questions.
    // Detect them and, if there's more than one, mark each separately.
    let singleQuestionNumber: string | null = null
    if (isCombinedScript) {
      const split = await splitUploadIntoQuestions(ocrText, practiceCode)
      if (split.length > 1) {
        const sharedIb = await resolvePracticeIb(
          practiceCode,
          ibComponentKey,
          ibLevel
        )
        return await markSplitQuestions({
          split,
          practiceCode,
          resolvedIb: sharedIb,
          userId,
          isPaid,
          answerPhotoUrl,
          pagePhotoUrls,
          startedAt,
          fullScriptText: ocrText,
          // Page images + their OCR lines (bboxes) for per-question examiner-ink.
          // Empty for PDF uploads (no page photos), same as the single path.
          pageSources: pageOcrResults
            .filter((p) => p.photo_url)
            .map((p) => ({ photo_url: p.photo_url!, ocr_lines: p.lines })),
          onProgress,
        })
      }
      // Exactly one question detected — keep its number so an ingested official
      // scheme can still be matched on the single-question path below.
      if (split.length === 1) singleQuestionNumber = split[0].question_number
    }

    const extracted = await extractPracticeQuestionFromScript(
      ocrText,
      practiceCode
    )
    if (extracted.question_text.trim().length >= 10) {
      questionText = extracted.question_text
    } else if (isCombinedScript) {
      throw new Error(
        "We couldn't find a question in your upload. Try a clearer scan, or use My question mode to add the question separately."
      )
    }
    if (extracted.answer_text.trim().length >= 5) {
      ocrTextForMarking = extracted.answer_text
    }

    // M1: if the upload carries an IB component + level and the subject is
    // catalogued, resolve it. Non-catalogued subjects return null → unchanged path.
    resolvedIb = await resolvePracticeIb(practiceCode, ibComponentKey, ibLevel)
    // Attach the official points scheme for this single question when one is
    // ingested (parity with the multi-question path); else derive-then-mark.
    if (singleQuestionNumber) {
      resolvedIb = resolvedIbForQuestion(resolvedIb, singleQuestionNumber)
    }

    markingMode = 'general_criteria_practice'
    emitContext(onProgress, {
      paper_code: null,
      paper_session: null,
      question_number: null,
      subject_code: practiceCode,
      syllabus_tags: null,
    })
  } else {
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
    detection = await runPaperDetection(ocrText, questionText, subjectHint)
    detection = reconcileDetectionWithQuestion(detection, questionText)
  }

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

    emit(onProgress, 'finding_scheme')

    const lookup = await lookupMarkScheme(
      detectedPaper.paper_code,
      detectedPaper.paper_session,
      detectedPaper.question_number,
      {
        extractionMode: 'targeted',
        onExtracting: () => emit(onProgress, 'extracting_scheme'),
      }
    )
    markScheme = lookup.scheme
    markingMode = lookup.mode
    if (!lookup.wasCached && !lookup.scheme) {
      // cold extract attempted but failed — no extra progress stage
    }

    const subjectFromPaper = detectedPaper.paper_code.split('/')[0]
    emitContext(onProgress, {
      paper_code: detectedPaper.paper_code,
      paper_session: detectedPaper.paper_session,
      question_number: detectedPaper.question_number,
      subject_code: subjectFromPaper,
      syllabus_tags: markScheme?.syllabus_tags ?? null,
    })
  } else if (hasManualSelection && manualPaperCode) {
    emitContext(onProgress, {
      paper_code: manualPaperCode,
      paper_session: manualPaperSession,
      question_number: manualQuestionNumber,
      subject_code: manualSubjectCode ?? manualPaperCode.split('/')[0],
      syllabus_tags: null,
    })
  }

  if (
    markingMode === 'general_criteria' &&
    (!questionText || questionText.trim().length < 10)
  ) {
    throw new Error(
      'We could not identify this as a past paper question. Please also upload a photo of the question, or type the question text below.'
    )
  }
  }

  // No 'marking' emit here: markSingleQuestion now reports its own stages via
  // onStage, and it may start with 'deriving_scheme' (48%). Emitting 'marking'
  // (62%) first made the bar and the headline visibly run BACKWARDS on every
  // derive-path mark, which is most practice and freeform uploads.
  const {
    markingResult,
    lineReferences,
    errorClassifications,
    resolvedTags,
    markingMode: finalMode,
    rewritePlan,
  } = await markSingleQuestion({
    ocrText: ocrTextForMarking,
    ocrLines,
    questionText,
    markScheme,
    markingMode,
    paperCode: isPracticeQuestion
      ? `${practiceCode}/00`
      : detectedPaper?.paper_code,
    paperSession: detectedPaper?.paper_session,
    questionNumber: detectedPaper?.question_number,
    // Falls back to the user's selected subject for tagging when no paper was
    // detected — keeps freeform marks resolvable for mastery/review.
    fallbackSubjectCode: manualSubjectCode ?? fallbackSubjectCode ?? null,
    resolvedIb,
    // User-entered marks win; otherwise read the total stated in the question
    // text (deterministic) before falling back to model inference in the marker.
    questionTotalMarks: questionMarks ?? extractStatedTotalMarks(questionText),
    // Premium: full-marks rewrite on the focused single-question path only.
    rewrite: enableRewrite,
    // When streaming, hand the rewrite back as a plan so the caller can deliver
    // the marks first — otherwise paid users wait longest for their score.
    deferRewrite: deferRewrite && enableRewrite,
    // Keep the progress bar honest through derive → mark → verify, the ~2
    // minutes that previously showed no movement at all.
    onStage: (stage) => emit(onProgress, stage),
  })

  if (resolvedTags.length > 0 || detectedPaper || hasManualSelection) {
    emitContext(onProgress, {
      paper_code: detectedPaper?.paper_code ?? manualPaperCode,
      paper_session: detectedPaper?.paper_session ?? manualPaperSession,
      question_number:
        detectedPaper?.question_number ?? manualQuestionNumber,
      subject_code:
        (detectedPaper?.paper_code ?? manualPaperCode)?.split('/')[0] ??
        null,
      syllabus_tags: resolvedTags.length ? resolvedTags : null,
    })
  }

  const timeSpentSeconds = Math.max(
    1,
    Math.round((Date.now() - startedAt) / 1000)
  )

  // Persist the FULL multi-page script (every page photo + per-page examiner
  // ink) inside ai_marking — the attempts row only stores page 1 in
  // answer_photo_url, which silently dropped pages 2+ of multi-page uploads.
  const aiResult = toMarkingAIResult(markingResult)
  const answerPages = buildAllPageInk(
    aiResult,
    pageOcrResults
      .filter((p) => p.photo_url)
      .map((p) => ({ photo_url: p.photo_url as string, ocr_lines: p.lines }))
  )

  const { data: attempt } = await supabaseAdmin
    .from('attempts')
    .insert({
      mark_scheme_id: markScheme?.id || null,
      source_type: finalMode === 'official_mark_scheme' ? 'past_paper' : 'other',
      user_id: userId,
      question_text: questionText || (markScheme?.question_text ?? null),
      ocr_text: ocrText,
      ai_marking:
        answerPages.length > 0
          ? {
              ...markingResult,
              page_photo_urls: pagePhotoUrls,
              ink_pages: answerPages,
            }
          : markingResult,
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

  const paperCodeForSubject = isPracticeQuestion
    ? `${practiceCode}/00`
    : detectedPaper?.paper_code ?? markScheme?.paper_code ?? null
  const subject_code = resolveMarkResultSubjectCode({
    paper_code: paperCodeForSubject,
    subject_code: isPracticeQuestion ? practiceCode : undefined,
    syllabus_tags: resolvedTags,
  })

  if (userId && attempt?.id) {
    const { isCommunityEnabled } = await import('@/lib/community/enabled')
    if (isCommunityEnabled()) {
      const { awardMarkingXp } = await import('@/lib/community/feed')
      await awardMarkingXp(userId, subject_code, attempt.id)
    }
  }

  const markSchemeRubric = markScheme
    ? extractMarkSchemeRubric(markScheme.mark_scheme, markScheme.marking_type)
    : null

  return {
    marks_earned: markingResult.marks_earned,
    total_marks: markingResult.total_marks,
    ai_marking: markingResult,
    ocr_text: ocrText,
    question_text: questionText || markScheme?.question_text || null,
    marking_mode: finalMode,
    detected_paper: detectedPaper,
    subject_code,
    attempt_id: attempt?.id,
    syllabus_tags: resolvedTags,
    answer_photo_url: answerPhotoUrl,
    page_photo_urls: pagePhotoUrls.length ? pagePhotoUrls : undefined,
    line_references: lineReferences,
    ink_pages: answerPages.length ? answerPages : undefined,
    error_classifications: errorClassifications,
    upload_mode: 'single_question',
    time_spent_seconds: timeSpentSeconds,
    // Internal: consumed and stripped by the route before the payload is sent.
    _rewrite_plan: rewritePlan ?? undefined,
    mark_scheme_meta: markScheme
      ? {
          total_marks: markScheme.total_marks,
          marking_type: markScheme.marking_type ?? null,
          syllabus_tags: markScheme.syllabus_tags ?? [],
          question_number: markScheme.question_number,
          paper_code: markScheme.paper_code,
          paper_session: markScheme.paper_session,
        }
      : detectedPaper
        ? {
            total_marks: markingResult.total_marks,
            marking_type: markingResult.marking_style ?? null,
            syllabus_tags: resolvedTags,
            question_number: detectedPaper.question_number,
            paper_code: detectedPaper.paper_code,
            paper_session: detectedPaper.paper_session,
          }
        : null,
    mark_scheme_rubric: markSchemeRubric,
  }
}
