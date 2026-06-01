/**
 * Patterns = "how do you tend to lose marks?" Derived purely from the per-mark
 * error_classifications the marking pipeline already stores on each attempt.
 * We never invent a pattern: if there isn't enough labelled data we return an
 * empty list and the UI shows an honest empty state.
 */

import type { AttemptLite } from '@/lib/mastery'
import {
  ERROR_LABELS,
  type ErrorClassification,
} from '@/lib/error-classifications'
import type { Pattern } from './types'

/** Errors worth surfacing — `no_error` is a correct mark, not a pattern. */
const REMEDIABLE: ErrorClassification[] = [
  'conceptual',
  'algebraic_sign',
  'arithmetic',
  'incomplete',
  'time_pressure',
]

const REMEDY: Record<ErrorClassification, string> = {
  conceptual:
    'These are understanding gaps, not slips. Revisit the method before drilling more questions.',
  algebraic_sign:
    'Your method is sound — slow down on sign changes and re-check each line of algebra.',
  arithmetic:
    'The approach is right; the marks leak in the computation. Verify each numeric step.',
  incomplete:
    'You stop short of the final marks. Push every question through to a stated answer.',
  time_pressure:
    'Clusters of small errors suggest rushing. Practise these under a timer to build pace.',
  no_error: '',
}

const RECENT_WINDOW = 12

/**
 * Rank error patterns across the most recent attempts. Returns at most `limit`
 * patterns, strongest first. Empty array when there's nothing honest to say.
 */
export function analysePatterns(
  attempts: AttemptLite[],
  limit = 4
): Pattern[] {
  // attempts arrive newest-first; analyse the recent window.
  const scope = attempts.slice(0, RECENT_WINDOW)
  const analysed = scope.length
  if (analysed === 0) return []

  const counts = new Map<ErrorClassification, number>()
  const affected = new Map<ErrorClassification, number>()

  for (const attempt of scope) {
    const details = attempt.error_classifications || []
    const seenInThisAttempt = new Set<ErrorClassification>()
    for (const d of details) {
      const c = d.classification
      if (!REMEDIABLE.includes(c)) continue
      counts.set(c, (counts.get(c) || 0) + 1)
      if (!seenInThisAttempt.has(c)) {
        affected.set(c, (affected.get(c) || 0) + 1)
        seenInThisAttempt.add(c)
      }
    }
  }

  const patterns: Pattern[] = []
  for (const c of REMEDIABLE) {
    const count = counts.get(c) || 0
    if (count === 0) continue
    const attemptsAffected = affected.get(c) || 0
    const meta = ERROR_LABELS[c]
    patterns.push({
      classification: c,
      label: meta.label,
      color: meta.color,
      count,
      attemptsAffected,
      attemptsAnalysed: analysed,
      insight: buildInsight(meta.label, attemptsAffected, analysed, REMEDY[c]),
    })
  }

  patterns.sort((a, b) => b.count - a.count || b.attemptsAffected - a.attemptsAffected)
  return patterns.slice(0, limit)
}

function buildInsight(
  label: string,
  attemptsAffected: number,
  analysed: number,
  remedy: string
): string {
  const lead =
    attemptsAffected >= 2
      ? `${label} showed up in ${attemptsAffected} of your last ${analysed} marked questions.`
      : `${label} appeared in your recent work.`
  return `${lead} ${remedy}`
}

export type SpeedProfile = {
  quadrant: 'master' | 'perfectionist' | 'rushed' | 'critical' | null
  label: string
  detail: string
  timedCount: number
}

const ACCURACY_THRESHOLD = 75

/**
 * Condense the speed-vs-accuracy signal into a single profile line for the
 * Patterns panel. Mirrors the bucketing in components/progress/SpeedAccuracy.
 */
export function analyseSpeedProfile(attempts: AttemptLite[]): SpeedProfile {
  const timed = attempts.filter(
    (a) =>
      typeof a.time_spent_seconds === 'number' &&
      (a.time_spent_seconds as number) > 0 &&
      a.total_marks > 0
  )

  if (timed.length === 0) {
    return {
      quadrant: null,
      label: 'Pace not tracked yet',
      detail:
        'Older attempts have no timing data. Newly marked questions time themselves automatically.',
      timedCount: 0,
    }
  }

  const perMark = timed
    .map((a) => (a.time_spent_seconds as number) / a.total_marks)
    .sort((x, y) => x - y)
  const mid = Math.floor(perMark.length / 2)
  const median =
    perMark.length % 2 === 0
      ? (perMark[mid - 1] + perMark[mid]) / 2
      : perMark[mid]

  const buckets = { master: 0, perfectionist: 0, rushed: 0, critical: 0 }
  for (const a of timed) {
    const tpm = (a.time_spent_seconds as number) / a.total_marks
    const pct = (a.marks_earned / a.total_marks) * 100
    const fast = tpm <= median
    const accurate = pct >= ACCURACY_THRESHOLD
    if (fast && accurate) buckets.master += 1
    else if (!fast && accurate) buckets.perfectionist += 1
    else if (fast && !accurate) buckets.rushed += 1
    else buckets.critical += 1
  }

  const dominant = (Object.entries(buckets).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] || 'master') as SpeedProfile['quadrant']

  const COPY: Record<NonNullable<SpeedProfile['quadrant']>, { label: string; detail: string }> = {
    master: {
      label: 'Fast and accurate',
      detail: 'You mostly solve at exam pace with the marks to match. Keep it up.',
    },
    perfectionist: {
      label: 'Accurate but slow',
      detail: 'You get there, but exam time pressure could catch you out. Drill for speed.',
    },
    rushed: {
      label: 'Fast but leaking marks',
      detail: 'Easy marks are slipping out from haste. Slow down and show full working.',
    },
    critical: {
      label: 'Slow and inaccurate',
      detail: 'These read as foundation gaps, not pace. Revisit the topic before drilling.',
    },
  }

  const copy = COPY[dominant || 'master']
  return {
    quadrant: dominant,
    label: copy.label,
    detail: copy.detail,
    timedCount: timed.length,
  }
}
