/**
 * Exam countdown + revision pacing — pure + testable, evergreen (the user supplies
 * their own exam date, so nothing here decays between sessions).
 */

const DAY_MS = 24 * 60 * 60 * 1000

export type CountdownPhase = 'early' | 'plan' | 'build' | 'final' | 'exam-day'

export type RevisionCountdown = {
  daysLeft: number
  weeksLeft: number
  phase: CountdownPhase
  /** Short guidance for the phase. */
  headline: string
  advice: string
  /** Suggested past papers per week to clear the target by exam day. */
  papersPerWeek: number | null
}

const PHASE_COPY: Record<CountdownPhase, { headline: string; advice: string }> = {
  early: {
    headline: 'Plenty of runway',
    advice:
      'Focus on understanding each syllabus topic. Bank a few past-paper questions per topic as you finish it, so revision later is recall, not first contact.',
  },
  plan: {
    headline: 'Cover the syllabus, then drill',
    advice:
      'Finish covering every topic first, then layer in past papers topic by topic. Mark each attempt against the official scheme so you know exactly where marks go.',
  },
  build: {
    headline: 'Alternate topics and full papers',
    advice:
      'Mix targeted topic drills with full timed papers. Mark every paper strictly, log each dropped mark, and re-drill those specific skills before the next paper.',
  },
  final: {
    headline: 'Final week — timed papers only',
    advice:
      'Full timed past papers, marked strict, reviewing only your weakest spots. No new topics. Protect sleep — calm recall beats last-minute cramming.',
  },
  'exam-day': {
    headline: 'It is exam time',
    advice:
      'Light recall and rest. Pack your kit, skim your lost-mark log, and trust the practice you have already banked.',
  },
}

/** Days until an exam date (UTC ms), clamped at 0. */
export function daysLeft(examMs: number, nowMs: number): number {
  if (!Number.isFinite(examMs) || !Number.isFinite(nowMs)) return 0
  return Math.max(0, Math.ceil((examMs - nowMs) / DAY_MS))
}

function phaseFor(days: number): CountdownPhase {
  if (days <= 0) return 'exam-day'
  if (days <= 7) return 'final'
  if (days <= 28) return 'build'
  if (days <= 84) return 'plan'
  return 'early'
}

/**
 * Build a countdown + pacing plan. `targetPapers` is the total number of past
 * papers the student wants to complete before the exam (e.g. subjects × papers each).
 */
export function buildCountdown(
  examMs: number,
  nowMs: number,
  targetPapers?: number
): RevisionCountdown {
  const days = daysLeft(examMs, nowMs)
  const weeks = Math.max(1, Math.ceil(days / 7))
  const phase = phaseFor(days)
  const copy = PHASE_COPY[phase]

  let papersPerWeek: number | null = null
  if (targetPapers && targetPapers > 0 && days > 0) {
    papersPerWeek = Math.ceil(targetPapers / weeks)
  }

  return {
    daysLeft: days,
    weeksLeft: days > 0 ? weeks : 0,
    phase,
    headline: copy.headline,
    advice: copy.advice,
    papersPerWeek,
  }
}
