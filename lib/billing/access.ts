import type { SubscriptionTier, SubscriptionStatus } from '@/lib/database.types'

/**
 * Effective access level — the single concept the whole app gates on.
 * Marketing names: free / Pro / Max.
 *
 * There is no trial. The 7-day no-card reverse trial and the Scholar/Max
 * checkout trial were both removed; access is now paid or it is free.
 * `trialing` stays in ACTIVE_STATUSES only because Polar can still report it
 * for subscriptions created before the checkout trial was switched off.
 */
export type EffectiveAccess = 'free' | 'pro' | 'max'

// `past_due` keeps access during Polar's payment-recovery (dunning) window — a
// temporary card decline shouldn't instantly lock the user out. Access is only
// removed when Polar escalates to `subscription.revoked` (→ tier free / status
// canceled) or the status moves to canceled/unpaid.
export const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing', 'past_due']

export function effectiveAccess(opts: {
  tier: SubscriptionTier
  status: SubscriptionStatus
}): EffectiveAccess {
  const paidActive = opts.tier !== 'free' && ACTIVE_STATUSES.includes(opts.status)
  if (!paidActive) return 'free'
  // mastery → Max; scholar (and legacy `student`) → Pro.
  return opts.tier === 'mastery' ? 'max' : 'pro'
}

/**
 * Whether this access level unlocks the interactive lesson content — live
 * diagrams, practice questions, flashcards, quick-check, concept map. Free
 * users get notes + formulas + worked examples only.
 */
export function hasFullLessonAccess(access: EffectiveAccess): boolean {
  return access !== 'free'
}
