import type { EffectiveAccess } from '@/lib/billing/access'

/**
 * Feed boost given to a subscriber's post.
 *
 * The hot score is Reddit-style — `log10(score) + age/45000` — so a whole point
 * is worth ten times the votes, or about twelve and a half hours of freshness.
 * 0.35 is worth a bit more than double the upvotes: enough that a subscriber's
 * post surfaces above comparable free posts, not so much that it outranks a
 * post the room actually liked more. A genuinely better free post still wins,
 * which is the only version of this that does not slowly hollow out the feed.
 */
export const PAID_HOT_BOOST = 0.35

/** Mirrors the `community_hot` SQL function, so JS re-ranking matches the DB. */
export function communityHot(score: number, createdAt: string): number {
  const magnitude = Math.log10(Math.max(Math.abs(score), 1))
  const direction = Math.sign(Math.max(score, -1))
  const age = (Date.parse(createdAt) / 1000 - 1700000000) / 45000
  return magnitude * direction + age
}

/** Subscribers are boosted; free accounts and unverified teachers are not. */
export function hotBoostFor(access: EffectiveAccess): number {
  return access === 'free' ? 0 : PAID_HOT_BOOST
}

/**
 * Rank posts for the `hot` feed, boosting subscribers.
 *
 * Applied in JS rather than baked into `hot_rank` because the column is
 * recomputed by a vote trigger that knows nothing about billing, and because a
 * stored boost would go stale the moment a subscription lapsed — leaving
 * cancelled accounts permanently promoted.
 */
export function rankHot<T extends { score: number; createdAt: string; isPinned: boolean; authorAccess: EffectiveAccess }>(
  posts: readonly T[]
): T[] {
  return [...posts].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    const rankA = communityHot(a.score, a.createdAt) + hotBoostFor(a.authorAccess)
    const rankB = communityHot(b.score, b.createdAt) + hotBoostFor(b.authorAccess)
    if (rankA !== rankB) return rankB - rankA
    return b.createdAt.localeCompare(a.createdAt)
  })
}
