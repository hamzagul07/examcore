import type { SubscriptionTier, SubscriptionStatus } from '@/lib/database.types'

/**
 * Effective access level — the single concept the whole app gates on.
 * Marketing names: free / Pro / Max. `trial` grants Pro-level access for the
 * 7-day no-card reverse trial. Client-safe (no server-only deps).
 */
export type EffectiveAccess = 'free' | 'trial' | 'pro' | 'max'

const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing']

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

/** The subscription tier whose caps apply to an access level. */
export function capTierForAccess(access: EffectiveAccess): SubscriptionTier {
  switch (access) {
    case 'max':
      return 'mastery'
    case 'pro':
    case 'trial':
      return 'scholar'
    default:
      return 'free'
  }
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
