import type { MasteryLevel } from '@/lib/mastery'

export const INTERVAL_CAP_DAYS = 14

/**
 * Next spaced-review interval (days) after a re-practice, tuned by how the
 * student is *now* doing on the topic instead of a fixed ladder:
 *   - still failing (critical)  → 1 day, keep hammering it
 *   - shaky (< 60%)             → gradual +1, capped at 4
 *   - stabilising (>= 60%)      → double the interval, up to the cap
 *
 * (Only weak topics — critical/sampled — are ever scheduled; once a topic
 * reaches proficient/exam-ready it leaves the review queue entirely.)
 */
export function nextReviewInterval(
  prevInterval: number,
  level: MasteryLevel,
  percentage: number
): number {
  const prev = Math.max(1, prevInterval || 1)
  if (level === 'critical') return 1
  if (percentage < 60) return Math.min(Math.max(prev + 1, 2), 4)
  return Math.min(prev * 2, INTERVAL_CAP_DAYS)
}
