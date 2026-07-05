import type { SubscriptionTier, SubscriptionStatus } from '@/lib/database.types'

/**
 * Effective access level — the single concept the whole app gates on.
 * Marketing names: free / Pro / Max. `trial` is legacy (reverse no-card trial,
 * no longer granted on signup). Scholar/Max checkout trials use status
 * `trialing` with a paid tier instead.
 */
export type EffectiveAccess = 'free' | 'trial' | 'pro' | 'max'

// `past_due` keeps access during Polar's payment-recovery (dunning) window — a
// temporary card decline shouldn't instantly lock the user out. Access is only
// removed when Polar escalates to `subscription.revoked` (→ tier free / status
// canceled) or the status moves to canceled/unpaid.
export const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing', 'past_due']

export function effectiveAccess(opts: {
  tier: SubscriptionTier
  status: SubscriptionStatus
  trialEndsAt?: string | null
  now?: Date
}): EffectiveAccess {
  const now = opts.now ?? new Date()
  const paidActive = opts.tier !== 'free' && ACTIVE_STATUSES.includes(opts.status)
  if (paidActive) {
    // mastery → Max; scholar (and legacy `student`) → Pro.
    return opts.tier === 'mastery' ? 'max' : 'pro'
  }
  if (opts.trialEndsAt && new Date(opts.trialEndsAt).getTime() > now.getTime()) {
    return 'trial'
  }
  return 'free'
}

/** Whole days remaining in the reverse trial (0 if none / expired). */
export function trialDaysLeft(trialEndsAt?: string | null, now: Date = new Date()): number {
  if (!trialEndsAt) return 0
  const ms = new Date(trialEndsAt).getTime() - now.getTime()
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000)
}

/**
 * Whether this access level unlocks the interactive lesson content — live
 * diagrams, practice questions, flashcards, quick-check, concept map. Free
 * users get notes + formulas + worked examples only.
 */
export function hasFullLessonAccess(access: EffectiveAccess): boolean {
  return access !== 'free'
}
