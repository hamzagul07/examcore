import type { SubscriptionTier } from '@/lib/database.types'

/**
 * App Store / Play Store product ids → plan tier.
 *
 * RevenueCat proves the ENTITLEMENT ("this person has premium"); the product id
 * is the only thing that says which plan they bought. Store product ids are
 * created by hand in App Store Connect and the Play Console, so this map is the
 * one place that has to agree with them — see docs/STORE_ENTITLEMENTS.md.
 */
const TIER_BY_TOKEN: Record<string, SubscriptionTier> = {
  scholar: 'scholar',
  mastery: 'mastery',
  max: 'mastery',
  starter: 'student',
  student: 'student',
  pro: 'student',
}

/**
 * Matching is on whole TOKENS, not substrings.
 *
 * A substring match looked tidier and was wrong: 'pro' appears inside
 * "product" and "promotional", and 'max' inside "maximum", so
 * `com.markscheme.app.product.free_trial` mapped to a paid tier. Splitting on
 * non-alphanumerics means the plan word has to actually be a word.
 */
function tokenise(productId: string): string[] {
  return productId.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean)
}

/**
 * The tier a store product grants, or null when the id is unrecognised.
 *
 * Callers decide what to do with null. The webhook grants the lowest paid tier
 * and logs loudly: RevenueCat has already confirmed the person paid and holds
 * the entitlement, so giving them nothing would be the worse error — but we must
 * not silently guess them into Max either.
 */
export function tierForStoreProduct(
  productId: string | null | undefined
): SubscriptionTier | null {
  if (!productId) return null
  for (const token of tokenise(productId)) {
    const tier = TIER_BY_TOKEN[token]
    // First recognised token wins, so a rename that collides reads left to
    // right and stays deterministic rather than depending on map order.
    if (tier) return tier
  }
  return null
}

/** What an unknown-but-paid product falls back to. Lowest paid tier, never Max. */
export const FALLBACK_PAID_TIER: SubscriptionTier = 'student'
