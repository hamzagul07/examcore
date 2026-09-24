/**
 * The three roadmap modes, and the numbers each one hands the scorer and the
 * scheduler. Every constant here is reviewable on its own: the comment says
 * what it does and why it is the size it is.
 *
 * "Desperate for a pass" is a real feeling and a poor product name. The
 * planner's preparedness codes ('pass' | 'secure' | 'stretch') stay valid in
 * the database and map here, so the first plans keep reading; the copy the
 * student sees is the mode's.
 */

import type { LoopStep, RoadmapMode, SessionLength, TaskType } from '@/lib/plan/roadmap-types'

export const MODE_LABEL: Record<RoadmapMode, string> = {
  foundation: 'Foundation Focus',
  balanced: 'Balanced Revision',
  polish: 'Exam Polish',
}

export const MODE_BLURB: Record<RoadmapMode, string> = {
  foundation: 'Prioritise core skills, prerequisites, and representative practice.',
  balanced: 'Balance coverage, weak-topic repair, practice, and review.',
  polish: 'Fine-tune weaknesses, practise under time, and build confidence.',
}

/** A second line for the wizard: who the mode suits, in plain words. */
export const MODE_SUITS: Record<RoadmapMode, string> = {
  foundation: 'Late start, big gaps, or a subject that never clicked. Finish each topic properly before moving on.',
  balanced: 'Most students. Cover the syllabus, fix what leaks marks, and keep reviewing.',
  polish: 'You know it. Timed practice, error patterns, and technique until exam day.',
}

/** The planner's preparedness codes → modes, for plans built before v3. */
export const LEGACY_PREPAREDNESS_TO_MODE = {
  pass: 'foundation',
  secure: 'balanced',
  stretch: 'polish',
} as const satisfies Record<'pass' | 'secure' | 'stretch', RoadmapMode>

export const MODE_TO_LEGACY_PREPAREDNESS: Record<RoadmapMode, 'pass' | 'secure' | 'stretch'> = {
  foundation: 'pass',
  balanced: 'secure',
  polish: 'stretch',
}

export function isRoadmapMode(value: unknown): value is RoadmapMode {
  return value === 'foundation' || value === 'balanced' || value === 'polish'
}

/** Any stored code — old or new — as a mode. Unknown reads as balanced. */
export function modeFromStored(value: string | null | undefined): RoadmapMode {
  if (isRoadmapMode(value)) return value
  if (value === 'pass' || value === 'secure' || value === 'stretch') return LEGACY_PREPAREDNESS_TO_MODE[value]
  return 'balanced'
}

// --- the priority model ------------------------------------------------------------

/**
 * Weights on the priority model's terms:
 *
 *   score = urgency × (importance × (1 + w.evidence × evidence) × (w.gap × gap) × (w.improvement × improvement)
 *                      + w.prerequisite × prerequisite + w.review × review)
 *
 * where, per topic (priority.ts):
 *   gap         = 1 − mastery, mastery blended from marks and the self-rating prior
 *   improvement = (1 − mastery) × min(1, daysToPaper / daysTheLoopNeeds) — learnable in the time left,
 *                 so a fresh topic two days out scores ~0 and a rusty one scores high
 *   evidence    = indexed representation (papers / of) — it MULTIPLIES importance rather than standing
 *                 alone, so frequency lifts an untested high-yield topic above an untested low-yield one
 *                 but a topic with a measured gap of 0.7 never ranks under one with a gap of 0.2
 *   urgency     = max(URGENCY_FLOOR, 1 + w.urgency × (1 − daysToPaper / planLength)) — a far paper
 *                 never drops below half weight; a near one rises
 *
 * Foundation leans on importance and prerequisites and finishes loops before
 * widening; Balanced weighs the student's own gaps and the review queue;
 * Polish weights indexed representation and error patterns and spends more
 * of its minutes under time.
 */
export type ModeWeights = {
  importance: number
  gap: number
  improvement: number
  prerequisite: number
  review: number
  evidence: number
  /** How steeply urgency rises as a paper nears. */
  urgency: number
  /** Share of scheduled work minutes that should be timed work (papers, timed sets). */
  timedShare: number
  /** Share of scheduled work minutes reserved for spaced review of earlier topics. */
  reviewShare: number
  /** Share of the score-ranked pool the mode insists on reaching (feasibility's "must"). */
  mustShare: number
}

export const MODE_WEIGHTS: Record<RoadmapMode, ModeWeights> = {
  foundation: {
    importance: 1.4,
    gap: 1.0,
    improvement: 1.0,
    prerequisite: 0.6,
    review: 0.6,
    evidence: 0.6,
    urgency: 1.0,
    timedShare: 0.1,
    // Highest of the three: foundation students are encoding for the first
    // time and forget fastest.
    reviewShare: 0.25,
    mustShare: 0.5,
  },
  balanced: {
    importance: 1.0,
    gap: 1.2,
    improvement: 1.0,
    prerequisite: 0.4,
    review: 0.7,
    evidence: 0.8,
    urgency: 1.0,
    timedShare: 0.2,
    reviewShare: 0.2,
    mustShare: 0.65,
  },
  polish: {
    importance: 0.8,
    gap: 1.1,
    improvement: 0.8,
    prerequisite: 0.2,
    review: 0.8,
    evidence: 1.0,
    urgency: 1.2,
    // Polish's review need is mostly met by error review and timed work.
    timedShare: 0.45,
    reviewShare: 0.15,
    mustShare: 0.8,
  },
}

/** No live subject's urgency drops below this, however far its paper is. */
export const URGENCY_FLOOR = 0.5
/** Every live subject gets at least one task in any window of this many study days, until its taper. */
export const SUBJECT_TOUCH_EVERY_STUDY_DAYS = 3
/**
 * A leaf whose mastery is this unsure is scheduled a diagnostic first,
 * whatever the rating. Uncertainty is 1 − attempts / CONFIDENT_ATTEMPTS, so
 * 0.3 catches every leaf with fewer than three marked attempts (two attempts
 * read as 0.33) and none with three or more (0). The §10 rule, in a number.
 */
export const DIAGNOSE_WHEN_UNCERTAINTY_AT_LEAST = 0.3
/** Below this measured percentage (with enough attempts) a topic is weak. */
export const WEAK_BELOW_PCT = 65
/** Below this the weak-area evidence is high confidence rather than medium. */
export const CRITICAL_BELOW_PCT = 40

// --- sizing ---------------------------------------------------------------------------

/**
 * Minutes each step takes, before the session length rounds it. These are
 * what the student sees on the card, so feasibility's demand is built from
 * the same numbers — a "5-minute diagnostic" that opens a 20-minute marked
 * question would teach them the durations are fiction.
 */
export const STEP_MINUTES: Record<Exclude<TaskType, 'buffer' | 'rest' | 'break' | 'timed_paper'>, number> = {
  diagnostic: 10,
  concept: 20,
  recall: 10,
  worked_example: 15,
  question: 20,
  timed_set: 30,
  error_review: 15,
  mixed: 25,
  review: 10,
}

/** The shortest a task of each type may be; a slot shorter than the smallest of these is not a slot. */
export const MIN_TASK_MINUTES: Record<TaskType, number> = {
  diagnostic: 10,
  concept: 15,
  recall: 10,
  worked_example: 15,
  question: 15,
  timed_set: 30,
  error_review: 10,
  mixed: 20,
  // A sitting shorter than this is not a paper; the scheduler offers a timed set instead.
  timed_paper: 40,
  review: 10,
  buffer: 10,
  rest: 0,
  break: 5,
}

/** Timed papers only when the session length allows an uninterrupted sitting. */
export const TIMED_PAPER_MIN_SESSION: SessionLength = 40

// --- loops ------------------------------------------------------------------------------

/**
 * The loop a topic runs through. Weak: short diagnostic → concise repair →
 * active recall → representative marked question → scheduled review.
 * Strong: timed mixed question → error review → later retrieval practice.
 *
 * The diagnostic is the branch point. A leaf whose mastery is only a prior
 * always starts with 'diagnose'; the steps placed after it are provisional
 * and the rollover re-branches them once the diagnostic has been marked.
 *
 * Steps are spaced, not massed: repair → recall waits for the next study
 * day (recall minutes after a refresh tests short-term memory); recall →
 * prove is the same day or the next; prove → review waits a study day too
 * (one timed set is not yet a pattern to read, and a night between the set
 * and its error review is what makes the re-read a check rather than an
 * echo); the spaced step after the loop is set by the result (reviewGapDays).
 */
export const WEAK_TOPIC_LOOP: ReadonlyArray<{ step: LoopStep; taskType: TaskType }> = [
  { step: 'diagnose', taskType: 'diagnostic' },
  { step: 'repair', taskType: 'concept' },
  { step: 'recall', taskType: 'recall' },
  { step: 'prove', taskType: 'question' },
  { step: 'review', taskType: 'review' },
]

export const STRONG_TOPIC_LOOP: ReadonlyArray<{ step: LoopStep; taskType: TaskType }> = [
  { step: 'prove', taskType: 'timed_set' },
  { step: 'review', taskType: 'error_review' },
  { step: 'recall', taskType: 'recall' },
]

/** Study days that must separate two steps: [from, to] → minimum gap (0 = same day allowed). */
export const STEP_GAP_DAYS: ReadonlyArray<{ from: LoopStep; to: LoopStep; minDays: number }> = [
  { from: 'diagnose', to: 'repair', minDays: 0 },
  { from: 'repair', to: 'recall', minDays: 1 },
  { from: 'recall', to: 'prove', minDays: 0 },
  { from: 'prove', to: 'review', minDays: 1 },
]

/**
 * Spaced reviews keep coming after the loop, at gaps that double each time:
 * the next review lands min(2 × the previous gap, this) study days after
 * the last one. Two reviews and silence until the taper (the first shape)
 * left most topics of a 90-day plan unseen for two months.
 */
export const REVIEW_GAP_MAX_STUDY_DAYS = 14

/** Work minutes a full loop needs, from STEP_MINUTES — the number feasibility counts per topic. */
export function loopMinutes(loop: 'weak' | 'strong'): number {
  const steps = loop === 'weak' ? WEAK_TOPIC_LOOP : STRONG_TOPIC_LOOP
  return steps.reduce((n, s) => n + (STEP_MINUTES as Record<string, number>)[s.taskType]!, 0)
}

/**
 * Days after a topic's marked question before its review comes back, by how
 * the question went — the same bands the review queue already uses
 * (lib/review/schedule.ts) — clamped so the review lands at least two days
 * before the paper. Inside the taper it becomes the taper's own review.
 * Unknown result (not marked yet) reads as 60%.
 */
export function reviewGapDays(provePct: number | null, daysToPaper: number): number {
  const pct = provePct ?? 60
  const gap = pct < 40 ? 1 : pct < 60 ? 2 : pct < 80 ? 4 : 7
  return Math.max(1, Math.min(gap, daysToPaper - 2))
}

/** A day's work is spread over this many subjects at most, by capacity: one short day is one subject. */
export function subjectsPerDay(capacityMinutes: number): number {
  if (capacityMinutes <= 60) return 1
  if (capacityMinutes <= 120) return 2
  return 3
}

// --- copy --------------------------------------------------------------------------------

/** Every "Why this?" sheet ends with this. A recommendation, not a prediction, and no endorsement. */
export const WHY_SHEET_FOOTER =
  'Chosen from the syllabus, your marked answers and what you told us — not a prediction of what will be on the paper. MarkScheme is not endorsed by Cambridge International or the IB.'

/** The one-liner when a task has no evidence beyond being on the syllabus. */
export const NEXT_IN_SYLLABUS = 'Next in the syllabus'
