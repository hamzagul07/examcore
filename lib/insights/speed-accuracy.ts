import type { AttemptLite } from '@/lib/mastery'

/**
 * Speed vs accuracy — the single source of truth for the bucketing.
 *
 * This existed twice: once in `analyseSpeedProfile` (live, feeding the Patterns
 * panel) and once in `components/progress/SpeedAccuracy` (never rendered).
 * Two copies of a threshold and a median is a drift waiting to happen — the
 * text under the chart could disagree with the chart itself. One implementation
 * now, consumed by both the profile line and the plot.
 */

export type SpeedQuadrant = 'master' | 'perfectionist' | 'rushed' | 'critical'

export type SpeedPoint = {
  id: string
  /** Seconds spent per available mark — the pace measure. */
  timePerMark: number
  /** Accuracy for that attempt, 0–100. */
  pct: number
  quadrant: SpeedQuadrant
  createdAt: string
}

export type SpeedAccuracyData = {
  points: SpeedPoint[]
  /** Median time-per-mark: the fast/slow divider. Null when nothing is timed. */
  median: number | null
  counts: Record<SpeedQuadrant, number>
  dominant: SpeedQuadrant | null
  /** Attempts carrying usable timing data. */
  timedCount: number
}

/** Accuracy at or above this counts as accurate. */
export const ACCURACY_THRESHOLD = 75

export function quadrantOf(
  timePerMark: number,
  pct: number,
  median: number
): SpeedQuadrant {
  const fast = timePerMark <= median
  const accurate = pct >= ACCURACY_THRESHOLD
  if (fast && accurate) return 'master'
  if (!fast && accurate) return 'perfectionist'
  if (fast && !accurate) return 'rushed'
  return 'critical'
}

export const QUADRANT_COPY: Record<
  SpeedQuadrant,
  { label: string; short: string }
> = {
  master: { label: 'Fast and accurate', short: 'Dialled in' },
  perfectionist: { label: 'Accurate but slow', short: 'Thorough' },
  rushed: { label: 'Fast but losing marks', short: 'Rushing' },
  critical: { label: 'Slow and losing marks', short: 'Struggling' },
}

/**
 * Median, not mean: a single 40-minute attempt shouldn't redefine "slow" for
 * everything else.
 */
function medianOf(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

export function buildSpeedAccuracy(attempts: AttemptLite[]): SpeedAccuracyData {
  const timed = attempts.filter(
    (a) =>
      typeof a.time_spent_seconds === 'number' &&
      (a.time_spent_seconds as number) > 0 &&
      a.total_marks > 0
  )

  const median = medianOf(
    timed.map((a) => (a.time_spent_seconds as number) / a.total_marks)
  )

  const counts: Record<SpeedQuadrant, number> = {
    master: 0,
    perfectionist: 0,
    rushed: 0,
    critical: 0,
  }

  const points: SpeedPoint[] =
    median == null
      ? []
      : timed.map((a) => {
          const timePerMark = (a.time_spent_seconds as number) / a.total_marks
          // Clamp: a reconciliation quirk that yields >100% would otherwise
          // push a point outside the plot area.
          const pct = Math.max(
            0,
            Math.min(100, (a.marks_earned / a.total_marks) * 100)
          )
          const quadrant = quadrantOf(timePerMark, pct, median)
          counts[quadrant] += 1
          return {
            id: String(a.id),
            timePerMark,
            pct,
            quadrant,
            createdAt: a.created_at,
          }
        })

  const dominant =
    points.length === 0
      ? null
      : (Object.entries(counts).sort((x, y) => y[1] - x[1])[0][0] as SpeedQuadrant)

  return { points, median, counts, dominant, timedCount: timed.length }
}
