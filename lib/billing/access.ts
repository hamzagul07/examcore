import type { SubscriptionTier, SubscriptionStatus } from '@/lib/database.types'

/**
 * Effective access level — the single concept the whole app gates on.
 * Marketing names: free / Pro (legacy) / Scholar / Max.
 *
 * `scholar` used to collapse into `pro`, which meant the app could not tell a
 * Scholar subscriber from a legacy Pro one or a teacher seat — so Scholar could
 * only ever be "Max with smaller numbers" and never hold a feature of its own.
 * It is its own level now.
 *
 * Ordering note for anyone adding a gate: paid-or-not checks are
 * `access !== 'free'`, Max exclusives `access === 'max'`, and anything Scholar
 * and above goes through `hasScholarFeatures` in ./features rather than being
 * written out by hand.
 *
 * `pro` now means exactly one thing — the Starter tier — because teacher seats
 * float to `scholar` (below). While it meant both, no comparison against it was
 * safe, which is why the paid gates were all `!== 'free'` and why Starter
 * initially shipped able to reach every Scholar feature.
 *
 * There is no trial. The 7-day no-card reverse trial and the Scholar/Max
 * checkout trial were both removed; access is now paid or it is free.
 * `trialing` stays in ACTIVE_STATUSES only because Polar can still report it
 * for subscriptions created before the checkout trial was switched off.
 */
export type EffectiveAccess = 'free' | 'pro' | 'scholar' | 'max'

// `past_due` keeps access during Polar's payment-recovery (dunning) window — a
// temporary card decline shouldn't instantly lock the user out. Access is only
// removed when Polar escalates to `subscription.revoked` (→ tier free / status
// canceled) or the status moves to canceled/unpaid.
export const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing', 'past_due']

export function effectiveAccess(opts: {
  tier: SubscriptionTier
  status: SubscriptionStatus
  /**
   * A *verified* teacher seat — `user_profiles.teacher_verified_at`, which only
   * the service role can write. Deliberately not the `role` column: that one is
   * self-declared during onboarding, so gating paid access on it would let
   * anyone claim a plan by ticking a box.
   */
  teacherVerified?: boolean
  /**
   * A manual entitlement grant (see lib/billing/comp.ts). Floors access, never
   * lowers it, so comping someone can never take away what they pay for.
   */
  accessOverride?: EffectiveAccess | null
}): EffectiveAccess {
  const paidActive = opts.tier !== 'free' && ACTIVE_STATUSES.includes(opts.status)
  // A teacher seat is a distribution cost, not a customer: it is given away so
  // that the class arrives with it. Floored rather than assigned, so a teacher
  // who does pay for Max keeps Max.
  //
  // Scholar, not Pro. `pro` used to mean two unrelated things — a teacher seat
  // and the legacy Pro tier — which is precisely why no `access === 'pro'`
  // comparison was safe to write, and therefore why every paid feature had to
  // be gated on the blunt `!== 'free'`. Now that `pro` carries the Starter tier
  // ($5.99, sold on /pricing), the two have to be told apart: gating whole-paper
  // marking at Scholar while teachers sat on `pro` would have taken class-set
  // marking away from the exact people the seat exists to reach.
  //
  // Nobody loses anything — floorAccess ranks scholar above pro, so this only
  // ever raises a teacher's access — and it costs nothing, because a teacher's
  // marking allowance is already its own number (teacherMarkCap).
  const earned: EffectiveAccess = !paidActive
    ? opts.teacherVerified
      ? 'scholar'
      : 'free'
    : // mastery → Max; scholar → Scholar; legacy `student` → Pro.
      opts.tier === 'mastery'
      ? 'max'
      : opts.tier === 'scholar'
        ? 'scholar'
        : 'pro'

  return floorAccess(earned, opts.accessOverride ?? null)
}

/** free < pro < scholar < max. Used to floor rather than replace access. */
const ACCESS_RANK: Record<EffectiveAccess, number> = {
  free: 0,
  pro: 1,
  scholar: 2,
  max: 3,
}

/** Returns whichever level is higher, so a grant can never demote anyone. */
export function floorAccess(
  earned: EffectiveAccess,
  granted: EffectiveAccess | null
): EffectiveAccess {
  if (!granted) return earned
  return ACCESS_RANK[granted] > ACCESS_RANK[earned] ? granted : earned
}

/**
 * Whether this account holds a granted teacher seat.
 *
 * Takes the verification timestamp, never the role, so that a caller cannot
 * accidentally pass the self-declared field.
 */
export function isVerifiedTeacher(teacherVerifiedAt?: string | null): boolean {
  return Boolean(teacherVerifiedAt)
}

/**
 * Whether this access level unlocks the interactive lesson content — live
 * diagrams, practice questions, flashcards, quick-check, concept map. Free
 * users get notes + formulas + worked examples only.
 */
export function hasFullLessonAccess(access: EffectiveAccess): boolean {
  return access !== 'free'
}
