import type { SubscriptionTier } from '@/lib/database.types'
import type { EffectiveAccess } from './access'

/**
 * Monthly question caps per tier. 1 question = 1 single question OR 1 whole paper.
 * Centralized so UI and API agree. Client-safe (no server-only deps).
 */
export const TIER_MONTHLY_CAPS: Record<SubscriptionTier, number> = {
  free: 5,
  // Starter. Sized so the ladder still rises in value per mark as it rises in
  // price — 24c a mark here against 17c on Scholar — and so the step up has a
  // reason that is not just "more". A student marking a couple of questions a
  // week fits inside 25; one working through whole papers does not, and that is
  // exactly the person Scholar is for.
  student: 25,
  scholar: 120, // Scholar
  mastery: 250, // Max
}

/** Monthly in-app study chat message caps per tier (landing demo chat is not metered). */
export const TIER_OMNI_CAPS: Record<SubscriptionTier, number> = {
  free: 10,
  student: 40, // Starter
  scholar: 150, // Scholar
  mastery: 300, // Max
}

/**
 * Teacher caps.
 *
 * A teacher seat is a distribution cost, not a revenue line: the teacher who
 * puts this in front of a class is worth far more than the ~$11 they would
 * otherwise pay, and a teacher who hits a wall halfway through marking a class
 * set will not come back. So the cap is set high enough to be invisible during
 * real use — a set of 30 scripts marked several times a term — while still
 * being a cap, because marking runs on a paid model and an unbounded allowance
 * on a compromised account is an unbounded bill.
 *
 * Overridable by env so the ceiling can be lifted mid-campaign without a code
 * change, matching how ENFORCEMENT_MODE is read.
 */
const TEACHER_MARK_CAP_DEFAULT = 300
const TEACHER_OMNI_CAP_DEFAULT = 400

/** Positive integers only; anything else falls back to the default. */
function capFromEnv(raw: string | undefined, fallback: number): number {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

export function teacherMarkCap(): number {
  return capFromEnv(process.env.TEACHER_MARK_CAP, TEACHER_MARK_CAP_DEFAULT)
}

export function teacherOmniCap(): number {
  return capFromEnv(process.env.TEACHER_OMNI_CAP, TEACHER_OMNI_CAP_DEFAULT)
}

export function capForTier(tier: SubscriptionTier): number {
  return TIER_MONTHLY_CAPS[tier] ?? TIER_MONTHLY_CAPS.free
}

export function omniCapForTier(tier: SubscriptionTier): number {
  return TIER_OMNI_CAPS[tier] ?? TIER_OMNI_CAPS.free
}

/**
 * Cap for an effective access level. Access now maps straight onto a tier —
 * kept as its own function because every caller gates on access, not tier.
 *
 * A teacher gets the teacher cap unless they are paying for something larger;
 * upgrading must never reduce what someone already has.
 */
export function capForAccess(
  access: EffectiveAccess,
  capTier: SubscriptionTier,
  isTeacher = false
): number {
  const base = access === 'free' ? capForTier('free') : capForTier(capTier)
  return isTeacher ? Math.max(base, teacherMarkCap()) : base
}

export function omniCapForAccess(
  access: EffectiveAccess,
  capTier: SubscriptionTier,
  isTeacher = false
): number {
  const base = access === 'free' ? omniCapForTier('free') : omniCapForTier(capTier)
  return isTeacher ? Math.max(base, teacherOmniCap()) : base
}

/** Human label for a question cap. */
export function capLabel(tier: SubscriptionTier): string {
  return String(capForTier(tier))
}

/**
 * Marketing-facing plan name for a tier. The DB enum (free/student/scholar/
 * mastery) maps to the three paid brands: Starter / Scholar / Max.
 *
 * `student` was branded Pro and sold nowhere. Renaming it is safe because no
 * account held the tier when it was repriced (2026-09-06) — had one existed,
 * they would have seen their plan renamed under them.
 */
export function tierMarketingName(tier: SubscriptionTier): string {
  switch (tier) {
    case 'mastery':
      return 'Max'
    case 'scholar':
      return 'Scholar'
    case 'student':
      return 'Starter'
    default:
      return 'Free'
  }
}

/**
 * Current usage window for a tier. Subscribers use their Stripe period;
 * free users use the calendar month.
 */
export function currentPeriodWindow(opts: {
  tier: SubscriptionTier
  periodStart?: string | null
  periodEnd?: string | null
}): { start: string; end: string | null; source: 'subscription' | 'free_tier' } {
  if (opts.tier !== 'free' && opts.periodStart) {
    return {
      start: opts.periodStart,
      end: opts.periodEnd ?? null,
      source: 'subscription',
    }
  }
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    source: opts.tier === 'free' ? 'free_tier' : 'subscription',
  }
}
