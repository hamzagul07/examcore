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

export function parseWholePaperSegment(raw: string): {
  paper_code?: string
  paper_session?: string
  questions: SegmentedQuestion[]
} | null {
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
    }
  } catch {
    return null
  }
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
      estimated_grade = est.grade
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

export function aggregateWholePaperResults(
  paperCode: string | undefined,
  paperSession: string | undefined,
  results: QuestionMarkResult[],
  paperQuestions: PaperQuestionMeta[] = []
): WholePaperResult {
  const failed = results.filter((r) => r.status === 'marking_failed')
  const excluded = failed.length
  const isIncomplete = excluded > 0
  const scorable = results.filter((r) => r.status !== 'marking_failed')

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

  const scoreRows = fullList.filter((r) => r.status !== 'marking_failed')
  const fullEarned = scoreRows.reduce((s, r) => s + r.marks_earned, 0)
  const fullTotal = scoreRows.reduce((s, r) => s + r.total_marks, 0)

  const attempted_score = buildScoreBlock(
    attemptedEarned,
    attemptedTotal,
    paperCode,
    !isIncomplete
  )
  const full_paper_score = buildScoreBlock(
    fullEarned,
    fullTotal,
    paperCode,
    !isIncomplete
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
      ? `On questions you attempted: ${attemptedEarned}/${attemptedTotal} (${attempted_score.percentage}%). Full paper (unattempted = 0): ${fullEarned}/${fullTotal} (${full_paper_score.percentage}%).`
      : `You scored ${fullEarned}/${fullTotal} (${full_paper_score.percentage}%) across ${scoreRows.length} question(s).`

  if (excluded > 0) {
    summary += ` [${excluded} question${excluded > 1 ? 's' : ''} could not be marked — see details below]`
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
