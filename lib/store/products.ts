import type { SubscriptionTier } from '@/lib/database.types'

/**
 * App Store / Play Store product ids → plan tier.
 *
 * RevenueCat proves the ENTITLEMENT ("this person has premium"); the product id
 * is the only thing that says which plan they bought. Store product ids are
 * created by hand in App Store Connect and the Play Console, so this map is the
 * one place that has to agree with them — see docs/IN_APP_PURCHASES.md.
 *
 * Matching is on a substring so the monthly/annual suffixes and any platform
 * prefix don't each need an entry.
 */
const TIER_BY_PRODUCT_FRAGMENT: [fragment: string, tier: SubscriptionTier][] = [
  // Longest/most specific first — 'max' would otherwise also match nothing else,
  // but keeping the order explicit stops a future rename matching twice.
  ['scholar', 'scholar'],
  ['mastery', 'mastery'],
  ['max', 'mastery'],
  ['starter', 'student'],
  ['student', 'student'],
  ['pro', 'student'],
]

/**
 * The tier a store product grants, or null when the id is unrecognised.
 *
 * Callers decide what to do with null. The webhook grants the lowest paid tier
 * and logs loudly: RevenueCat has already confirmed the person paid and holds
 * the entitlement, so giving them nothing would be the worse error — but we must
 * not silently guess them into Max either.
 */
export function tierForStoreProduct(productId: string | null | undefined): SubscriptionTier | null {
  if (!productId) return null
  const id = productId.toLowerCase()
  for (const [fragment, tier] of TIER_BY_PRODUCT_FRAGMENT) {
    if (id.includes(fragment)) return tier
  }
  return null
}

/** What an unknown-but-paid product falls back to. Lowest paid tier, never Max. */
export const FALLBACK_PAID_TIER: SubscriptionTier = 'student'
