/**
 * Ranking rules for "which thread is *the* results thread right now".
 *
 * Kept free of `server-only` and of any DB import so the ordering — the part
 * that actually decides where results-week traffic lands — can be unit tested.
 */

/**
 * Flairs that mark a thread as part of the results-week conversation.
 *
 * Ordered by how well the thread answers "I have my grade, now what?" — a
 * boundary thread beats a generic results-day thread because the reader
 * arriving from a threshold page already has a raw mark in hand.
 */
export const RESULTS_FLAIRS = ['Grade boundaries', 'Results day', 'Results'] as const

export type RankableThread = {
  id: string
  flair: string | null
  is_pinned: boolean
  created_at: string
  subject_code?: string
  title?: string
}

function flairRank(flair: string | null): number {
  if (!flair) return RESULTS_FLAIRS.length
  const i = RESULTS_FLAIRS.indexOf(flair as (typeof RESULTS_FLAIRS)[number])
  return i === -1 ? RESULTS_FLAIRS.length : i
}

/**
 * Pick the thread to send a results-week reader to, or null if none qualifies.
 *
 * A thread from the current results cycle outranks everything older, pin or
 * not. Pins are sticky and some date back to earlier series: without the cycle
 * check the 9702 CTA lands readers on a thread about the 2024 boundaries while
 * the live June 2026 one sits below it. Within the cycle a pin still wins —
 * that is a deliberate "this is the thread" from a moderator.
 *
 * Returns null when every candidate predates the cycle. A reader who just got
 * a 2026 grade is better served by their subject room than by last series'
 * argument, so the caller falls back rather than linking something stale.
 */
export function pickResultsThread<T extends RankableThread>(
  rows: readonly T[],
  cycleStartUtc: number
): T | null {
  if (!rows.length) return null

  const inCycle = (row: RankableThread) => Date.parse(row.created_at) >= cycleStartUtc

  const best = [...rows].sort((a, b) => {
    const cycleA = inCycle(a)
    const cycleB = inCycle(b)
    if (cycleA !== cycleB) return cycleA ? -1 : 1
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
    const byFlair = flairRank(a.flair) - flairRank(b.flair)
    if (byFlair !== 0) return byFlair
    return b.created_at.localeCompare(a.created_at)
  })[0]

  return inCycle(best) ? best : null
}
