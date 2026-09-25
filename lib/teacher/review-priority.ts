/**
 * Which marked scripts a teacher should look at first
 * (docs/TEACHER_SYSTEM_SPEC.md §2.4; the review queue sorts by `priority`
 * descending, then by `created_at`).
 *
 * A teacher cannot re-read every script, so the queue leads with the ones
 * where a second pair of eyes is worth most: work the teacher set, marking the
 * AI was least sure of, and results that would change what happens next for
 * the student. Each signal carries a weight and a short reason, shown as a
 * chip, so the order is never a mystery ("why is this one first?").
 *
 * Weights (sum clamped to 0–100):
 *
 *   40  Flagged earlier — the teacher asked to come back to it
 *   25  Mock — set as a mock exam, so the mark is a decision input
 *   20  Scored zero — often an unreadable or mis-split script, not a zero
 *   20  Total estimated — the marker had to guess the question's total
 *   20  Marker changed its mind — the verify pass overturned marks
 *   15  Set work — handed in against one of the teacher's sets
 *   15  Near a grade boundary — one mark moves a paper-length script's A*–E grade
 *   15  Unusual for this student — far from their own recent average
 *   10  Judgement-based marking — banded / criterion marking, the most subjective
 *   10  Low score — below the `critical` line (levelFor)
 *   10  Repeated conceptual errors — two or more marks lost to misunderstanding
 *    5  Marked against an old guide — the rubric is withdrawn or not yet in force
 *
 * A script the teacher has already confirmed or re-marked scores 0; its
 * reasons are still returned so a "done" list can say why it was queued.
 * Pure: no clock, no I/O.
 */

import { marksToNextGrade } from '@/lib/grade-boundaries'
import { MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY } from '@/lib/mastery'
import { levelFor } from '@/lib/teacher/blindspots'
import type { ReviewDecision } from '@/lib/teacher/types'

export type AttemptForPriority = {
  marks_earned: number | null
  total_marks: number | null
  ai_marking?: {
    total_marks_source?: string | null
    marking_style?: string | null
    marks_awarded?: ReadonlyArray<{ earned?: boolean | null; error_classification?: string | null }> | null
    guide_notice?: { status?: string | null } | null
    /** Present on level-of-response scripts (full ai_marking). */
    band_result?: unknown
    /** Present on IB criterion-marked scripts (full ai_marking). */
    criteria_results?: unknown
    /** The same fact from the loaders' ai_marking slice (ClassroomAiMarking). */
    judgement_marking?: boolean | null
  } | null
  error_classifications?: ReadonlyArray<{ classification?: string | null }> | null
  /** The latest teacher decision on this attempt, if any. */
  decision?: ReviewDecision | null
  /** Set when the attempt is handed in against a set item. */
  assignment?: { is_mock: boolean } | null
  /** The student's own marks-weighted average over their other recent work. */
  student_mean_pct?: number | null
  /** How many marked attempts that average rests on. */
  student_attempt_count?: number | null
  /**
   * Whether A*–E percentage bands apply (default true). Pass false for IB or
   * AP classes, where "one mark from the next grade" cannot be read off them.
   */
  letter_grades?: boolean | null
}

export type ReviewPriority = { priority: number; reasons: string[] }

export const REVIEW_REASON = {
  flagged: 'Flagged earlier',
  mock: 'Mock',
  zero: 'Scored zero',
  estimatedTotal: 'Total estimated',
  markerChanged: 'Marker changed its mind',
  setWork: 'Set work',
  nearBoundary: 'Near a grade boundary',
  unusual: 'Unusual for this student',
  judgement: 'Judgement-based marking',
  lowScore: 'Low score',
  conceptual: 'Repeated conceptual errors',
  oldGuide: 'Marked against an old guide',
} as const

const WEIGHT: Record<keyof typeof REVIEW_REASON, number> = {
  flagged: 40,
  mock: 25,
  zero: 20,
  estimatedTotal: 20,
  markerChanged: 20,
  setWork: 15,
  nearBoundary: 15,
  unusual: 15,
  judgement: 10,
  lowScore: 10,
  conceptual: 10,
  oldGuide: 5,
}

/** Grade boundaries are meaningful at paper length, not on a 4-mark question. */
export const BOUNDARY_MIN_TOTAL = 20
/** Percentage points from the student's own average that count as unusual. */
export const UNUSUAL_GAP_POINTS = 25

/**
 * Banded (level-of-response) and criterion-marked scripts: the result is a
 * best-fit judgement against descriptors rather than a count of points.
 */
function isJudgementMarking(marking: AttemptForPriority['ai_marking']): boolean {
  if (!marking) return false
  if (norm(marking.marking_style) === 'level_of_response') return true
  if (marking.judgement_marking === true) return true
  const present = (v: unknown) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)
  return present(marking.band_result) || present(marking.criteria_results)
}

/**
 * Classifications the verify pass writes when it corrects the first marker
 * (the same vocabulary lib/teacher/cohort-gaps.ts keeps out of the student
 * view). On a review queue they are exactly the point: the marking moved.
 */
const MARKER_CORRECTIONS = new Set([
  'marker_error',
  'under_marking',
  'under_marked',
  'over_marking',
  'over_marked',
  'misclassification',
  'corrected_error',
  'overturned_first_marker_error',
])

const OLD_GUIDE = new Set(['withdrawn', 'final-session', 'not-yet-in-force'])

function norm(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/[-\s]+/g, '_')
}

export function scoreReviewPriority(a: AttemptForPriority): ReviewPriority {
  const hits: Array<keyof typeof REVIEW_REASON> = []
  const earned = typeof a.marks_earned === 'number' && Number.isFinite(a.marks_earned) ? a.marks_earned : null
  const total =
    typeof a.total_marks === 'number' && Number.isFinite(a.total_marks) && a.total_marks > 0 ? a.total_marks : null
  const pct = earned !== null && total !== null ? (Math.max(0, Math.min(earned, total)) / total) * 100 : null
  const marking = a.ai_marking ?? null

  if (a.decision === 'flag') hits.push('flagged')
  if (a.assignment?.is_mock) hits.push('mock')
  if (earned === 0 && total !== null) hits.push('zero')
  if (norm(marking?.total_marks_source) === 'estimated') hits.push('estimatedTotal')

  const points = marking?.marks_awarded ?? []
  if (points.some((p) => MARKER_CORRECTIONS.has(norm(p?.error_classification)))) {
    hits.push('markerChanged')
  }

  if (a.assignment) hits.push('setWork')

  if (a.letter_grades !== false && earned !== null && total !== null && total >= BOUNDARY_MIN_TOTAL) {
    const next = marksToNextGrade(earned, total)
    if (next && next.marksNeeded <= 1) hits.push('nearBoundary')
  }

  const mean = a.student_mean_pct
  const history = a.student_attempt_count ?? 0
  if (
    pct !== null &&
    typeof mean === 'number' &&
    Number.isFinite(mean) &&
    history >= MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY &&
    Math.abs(pct - mean) >= UNUSUAL_GAP_POINTS
  ) {
    hits.push('unusual')
  }

  if (isJudgementMarking(marking)) hits.push('judgement')
  // A zero already says it more strongly.
  if (pct !== null && earned !== 0 && levelFor(pct) === 'critical') hits.push('lowScore')

  const conceptual =
    (a.error_classifications ?? []).filter((e) => norm(e?.classification) === 'conceptual').length ||
    points.filter((p) => p?.earned !== true && norm(p?.error_classification) === 'conceptual').length
  if (conceptual >= 2) hits.push('conceptual')

  if (OLD_GUIDE.has((marking?.guide_notice?.status ?? '').trim().toLowerCase())) hits.push('oldGuide')

  // Heaviest first, so a UI showing two chips shows the two that matter.
  hits.sort((x, y) => WEIGHT[y] - WEIGHT[x])
  const reasons = hits.map((h) => REVIEW_REASON[h])
  const settled = a.decision === 'confirm' || a.decision === 'override'
  const priority = settled ? 0 : Math.min(100, hits.reduce((sum, h) => sum + WEIGHT[h], 0))
  return { priority, reasons }
}
