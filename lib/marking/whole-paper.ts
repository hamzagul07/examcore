import type {
  MarkingAIResult,
  QuestionMarkResult,
  WholePaperResult,
  WholePaperScoreBlock,
} from './types'
import { estimateGrade } from './grade-thresholds'
import { parsePaperCode } from './component-types'
import { extractJSON } from './json'
import { buildWholePaperSegmentPrompt } from './prompts'
import { sortQuestionNumbers } from './page-detection'

export type PaperQuestionMeta = {
  question_number: string
  total_marks: number
}

export type SegmentedQuestion = {
  question_number: string
  answer_text: string
}

export type WholePaperSegmentation = {
  paper_code?: string
  paper_session?: string
  questions: SegmentedQuestion[]
  /**
   * The model ran out of output before it finished the JSON, so the trailing
   * questions may be missing from `questions`. The caller must fall back to a
   * segmentation that cannot lose pages rather than mark what survived.
   */
  truncated: boolean
}

/**
 * Output that the model never finished. Two signals: the API's own finish
 * reason, and the raw text not closing its top-level object — `extractJSON`
 * repairs an unterminated document into a shorter valid one, which is exactly
 * how a 15-question paper was silently marked as 9.
 *
 * Segmentation must echo every answer's text, so this is not an edge case: at
 * the old 4000-token cap a dense paper overran it routinely.
 */
export function isTruncatedSegmentOutput(
  raw: string,
  finishReason?: string | null
): boolean {
  if (finishReason && finishReason.toUpperCase() === 'MAX_TOKENS') return true
  const body = raw.replace(/```json|```/gi, '').trim()
  if (!body) return false
  return body.startsWith('{') && !body.endsWith('}')
}

export function parseWholePaperSegment(
  raw: string,
  meta?: { finishReason?: string | null }
): WholePaperSegmentation | null {
  try {
    const parsed = extractJSON(raw) as Record<string, unknown>
    if (!parsed || !Array.isArray(parsed.questions)) return null
    return {
      paper_code:
        typeof parsed.paper_code === 'string' ? parsed.paper_code : undefined,
      paper_session:
        typeof parsed.paper_session === 'string'
          ? parsed.paper_session
          : undefined,
      questions: (parsed.questions as Record<string, unknown>[])
        .filter((q) => typeof q.question_number === 'string')
        .map((q) => ({
          question_number: String(q.question_number).trim(),
          answer_text:
            typeof q.answer_text === 'string' ? q.answer_text : '',
        })),
      truncated: isTruncatedSegmentOutput(raw, meta?.finishReason),
    }
  } catch {
    return null
  }
}

/**
 * Union of two segmentations by question number, `primary` first. Used when
 * the model's list was cut off: its questions keep their model-cleaned text,
 * and anything it never reached comes from the page-label split.
 */
export function mergeSegmentations(
  primary: SegmentedQuestion[],
  fallback: SegmentedQuestion[]
): SegmentedQuestion[] {
  const seen = new Set(primary.map((q) => normalizeQKey(q.question_number)))
  const merged = [...primary]
  for (const q of fallback) {
    const key = normalizeQKey(q.question_number)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(q)
  }
  return merged
}

function buildScoreBlock(
  marksEarned: number,
  totalMarks: number,
  paperCode?: string,
  includeProjection = true
): WholePaperScoreBlock {
  if (!includeProjection) {
    return {
      marks_earned: marksEarned,
      total_marks: totalMarks,
    }
  }
  const percentage =
    totalMarks > 0 ? Math.round((marksEarned / totalMarks) * 100) : 0
  let estimated_grade: string | undefined
  let grade_note: string | undefined
  if (paperCode) {
    const parsed = parsePaperCode(paperCode)
    if (parsed) {
      const est = estimateGrade(
        parsed.subjectCode,
        parsed.component,
        percentage
      )
      // '' means the board has no letter grades (IB, AP): percentage only.
      estimated_grade = est.grade || undefined
      grade_note = est.note
    }
  }
  return {
    marks_earned: marksEarned,
    total_marks: totalMarks,
    percentage,
    estimated_grade,
    grade_note,
  }
}

export const PREVIEW_CUT_SUMMARY =
  'Not marked in the free preview — this question is marked on Scholar.'

/**
 * The row for a question the student answered but the tier limit cut. It
 * carries the bank's total (so the paper's structure is intact) and no answer
 * text, so nothing downstream can mark it without the upgrade.
 */
export function buildPreviewCutResult(
  questionNumber: string,
  totalMarks: number
): QuestionMarkResult {
  return {
    question_number: questionNumber,
    marks_earned: 0,
    total_marks: totalMarks,
    marking_style: 'point_based',
    summary: PREVIEW_CUT_SUMMARY,
    status: 'not_marked_preview',
    ai_marking: {
      marks_earned: 0,
      total_marks: totalMarks,
      summary: PREVIEW_CUT_SUMMARY,
      weak_topics: [],
      what_to_study_next: '',
    },
    mark_scheme_id: null,
  }
}

/** Merge attempted results with full paper question list (unattempted = 0). */
export function buildFullQuestionList(
  attempted: QuestionMarkResult[],
  paperQuestions: PaperQuestionMeta[]
): QuestionMarkResult[] {
  const byNum = new Map(
    attempted.map((q) => [normalizeQKey(q.question_number), q])
  )
  const allNums = sortQuestionNumbers([
    ...paperQuestions.map((p) => p.question_number),
    ...attempted.map((q) => q.question_number),
  ])
  const unique = [...new Set(allNums)]

  return unique.map((question_number) => {
    const existing = byNum.get(normalizeQKey(question_number))
    if (existing) return existing
    const meta = paperQuestions.find(
      (p) => normalizeQKey(p.question_number) === normalizeQKey(question_number)
    )
    return {
      question_number,
      marks_earned: 0,
      total_marks: meta?.total_marks ?? 0,
      marking_style: 'point_based' as const,
      summary: 'Not attempted',
      status: 'unattempted' as const,
      ai_marking: {
        marks_earned: 0,
        total_marks: meta?.total_marks ?? 0,
        summary: 'Not attempted',
        weak_topics: [],
        what_to_study_next: '',
      },
      mark_scheme_id: null,
    }
  })
}

function normalizeQKey(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, '')
}

/**
 * Alias kept for the routes that import it: `is_truncated`,
 * `questions_in_paper` and `question_limit` now live on `WholePaperResult`
 * itself (lib/marking/types.ts), so the aggregate is the shared type.
 */
export type WholePaperAggregate = WholePaperResult

/** Rows that count towards a score: not failed, not cut by the tier limit. */
function isScoreRow(r: QuestionMarkResult): boolean {
  return r.status !== 'marking_failed' && r.status !== 'not_marked_preview'
}

export function aggregateWholePaperResults(
  paperCode: string | undefined,
  paperSession: string | undefined,
  results: QuestionMarkResult[],
  paperQuestions: PaperQuestionMeta[] = [],
  opts: { questionLimit?: number } = {}
): WholePaperAggregate {
  const failed = results.filter((r) => r.status === 'marking_failed')
  const excluded = failed.length
  const isIncomplete = excluded > 0
  const scorable = results.filter((r) => r.status !== 'marking_failed')

  // Free preview: questions the student answered that the tier limit cut.
  // They stay in the list (so the student sees what an upgrade would mark)
  // but never in a denominator — treating them as zero, as the old
  // 'unattempted' fill did, reported a 3-of-8 preview as a 30% paper.
  const previewCut = results.filter((r) => r.status === 'not_marked_preview')
  const isTruncated = previewCut.length > 0

  // Score only successfully marked / unattempted rows — never invent totals
  // from marking_failed (often total_marks = 0 bank-miss).
  const attemptedForScore = scorable.filter((r) => r.status === 'attempted')

  const attemptedEarned = attemptedForScore.reduce((s, r) => s + r.marks_earned, 0)
  const attemptedTotal = attemptedForScore.reduce((s, r) => s + r.total_marks, 0)

  const scorableList =
    paperQuestions.length > 0
      ? buildFullQuestionList(scorable, paperQuestions)
      : scorable

  // Keep failed questions in the displayed list so bank-miss / error guidance
  // is visible (previously they were dropped and only a summary note remained).
  const byNum = new Map(
    scorableList.map((q) => [normalizeQKey(q.question_number), q])
  )
  for (const f of failed) {
    byNum.set(normalizeQKey(f.question_number), f)
  }
  const orderedNums = sortQuestionNumbers([
    ...scorableList.map((q) => q.question_number),
    ...failed.map((q) => q.question_number),
  ])
  const fullList = [...new Set(orderedNums)]
    .map((qn) => byNum.get(normalizeQKey(qn)))
    .filter((q): q is QuestionMarkResult => !!q)

  const scoreRows = fullList.filter(isScoreRow)
  const fullEarned = scoreRows.reduce((s, r) => s + r.marks_earned, 0)
  const fullTotal = scoreRows.reduce((s, r) => s + r.total_marks, 0)

  const attempted_score = buildScoreBlock(
    attemptedEarned,
    attemptedTotal,
    paperCode,
    !isIncomplete
  )
  // A grade projected across a paper most of which was never marked is noise;
  // the attempted block still projects, because that is what was marked.
  const full_paper_score = buildScoreBlock(
    fullEarned,
    fullTotal,
    paperCode,
    !isIncomplete && !isTruncated
  )

  const show_dual_scores =
    attemptedTotal > 0 &&
    fullTotal > 0 &&
    (attemptedTotal !== fullTotal ||
      attemptedEarned !== fullEarned ||
      fullList.some((q) => q.status === 'unattempted'))

  const marks_earned = show_dual_scores ? attemptedEarned : fullEarned
  const total_marks = show_dual_scores ? attemptedTotal : fullTotal
  const percentage = show_dual_scores
    ? attempted_score.percentage
    : full_paper_score.percentage
  const estimated_grade = show_dual_scores
    ? attempted_score.estimated_grade
    : full_paper_score.estimated_grade
  const grade_note = show_dual_scores
    ? attempted_score.grade_note
    : full_paper_score.grade_note

  let summary = isIncomplete
    ? show_dual_scores
      ? `Marking incomplete. Successfully marked questions you attempted: ${attemptedEarned}/${attemptedTotal}. Full paper score so far (unattempted = 0): ${fullEarned}/${fullTotal}. No percentage or grade is projected until every attempted question is marked.`
      : `Marking incomplete: ${fullEarned}/${fullTotal} across ${scoreRows.length} successfully marked question(s). No percentage or grade is projected until every attempted question is marked.`
    : show_dual_scores
      ? `On questions you attempted: ${attemptedEarned}/${attemptedTotal} (${attempted_score.percentage}%). Full paper (unattempted = 0): ${fullEarned}/${fullTotal}${
          full_paper_score.percentage !== undefined
            ? ` (${full_paper_score.percentage}%)`
            : ''
        }.`
      : `You scored ${fullEarned}/${fullTotal}${
          full_paper_score.percentage !== undefined
            ? ` (${full_paper_score.percentage}%)`
            : ''
        } across ${scoreRows.length} question(s).`

  if (excluded > 0) {
    summary += ` [${excluded} question${excluded > 1 ? 's' : ''} could not be marked — see details below]`
  }
  if (isTruncated) {
    const marked = results.length - previewCut.length
    summary = `Free preview: marked ${marked} of the ${results.length} questions you answered — ${previewCut.length} more ${previewCut.length === 1 ? 'is' : 'are'} marked on Scholar. ${summary}`
  }
  if (estimated_grade) {
    summary += ` Estimated grade: ${estimated_grade}.`
  }

  return {
    upload_mode: 'whole_paper',
    marks_earned,
    total_marks,
    percentage,
    estimated_grade,
    grade_note,
    attempted_score: show_dual_scores ? attempted_score : undefined,
    full_paper_score,
    show_dual_scores,
    is_incomplete: isIncomplete || undefined,
    questions_excluded_count: excluded > 0 ? excluded : undefined,
    is_truncated: isTruncated || undefined,
    questions_in_paper: isTruncated ? results.length : undefined,
    question_limit: isTruncated
      ? opts.questionLimit ?? results.length - previewCut.length
      : undefined,
    questions: fullList,
    summary,
    paper_code: paperCode,
    paper_session: paperSession,
  }
}

export function estimateMarkingSeconds(questionCount: number): number {
  return Math.max(20, questionCount * 20)
}

export function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) return `~${seconds} seconds`
  const mins = Math.ceil(seconds / 60)
  return mins === 1 ? '~1 minute' : `~${mins} minutes`
}

export { buildWholePaperSegmentPrompt }

export function toMarkingAIResult(raw: Record<string, unknown>): MarkingAIResult {
  return {
    marks_awarded: Array.isArray(raw.marks_awarded)
      ? (raw.marks_awarded as MarkingAIResult['marks_awarded'])
      : [],
    marks_earned: Number(raw.marks_earned) || 0,
    total_marks: Number(raw.total_marks) || 0,
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    weak_topics: Array.isArray(raw.weak_topics)
      ? (raw.weak_topics as string[])
      : [],
    what_to_study_next:
      typeof raw.what_to_study_next === 'string' ? raw.what_to_study_next : '',
    estimated_marks_explanation:
      typeof raw.estimated_marks_explanation === 'string'
        ? raw.estimated_marks_explanation
        : undefined,
    syllabus_tags: Array.isArray(raw.syllabus_tags)
      ? (raw.syllabus_tags as string[])
      : undefined,
    marking_style:
      typeof raw.marking_style === 'string'
        ? (raw.marking_style as MarkingAIResult['marking_style'])
        : undefined,
    band_result:
      raw.band_result && typeof raw.band_result === 'object'
        ? (raw.band_result as MarkingAIResult['band_result'])
        : undefined,
    criteria_results: Array.isArray(raw.criteria_results)
      ? (raw.criteria_results as MarkingAIResult['criteria_results'])
      : undefined,
    mcq_breakdown: Array.isArray(raw.mcq_breakdown)
      ? (raw.mcq_breakdown as MarkingAIResult['mcq_breakdown'])
      : undefined,
  }
}
