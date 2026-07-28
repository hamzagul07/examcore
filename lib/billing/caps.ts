import type { SubscriptionTier } from '@/lib/database.types'
import type { EffectiveAccess } from './access'

/**
 * Monthly question caps per tier. 1 question = 1 single question OR 1 whole paper.
 * Centralized so UI and API agree. Client-safe (no server-only deps).
 */
export const TIER_MONTHLY_CAPS: Record<SubscriptionTier, number> = {
  free: 5,
  student: 50, // Pro
  scholar: 120, // Scholar
  mastery: 250, // Max
}

/** Monthly in-app study chat message caps per tier (landing demo chat is not metered). */
export const TIER_OMNI_CAPS: Record<SubscriptionTier, number> = {
  free: 10,
  student: 80, // Pro
  scholar: 150, // Scholar
  mastery: 300, // Max
}

/**
 * Caps for the 7-day no-card reverse trial.
 *
 * The trial carries Scholar-level *features* deliberately — the point is that
 * the student meets the whole coach, not a crippled preview. But it does not
 * need Scholar's *volume*: 120 marks at 3–4 Gemini Pro calls each, handed to
 * every signup with no card, is an unbounded bill attached to an unverified
 * account.
 *
 * 25 is 5× the free tier and far more than anyone works through in a week — the
 * top 5 users of the whole product averaged well under this — so it bounds the
 * exposure without the student ever feeling the edge. Raise it if trial users
 * start hitting the cap; that would be a good problem and it is a one-line
 * change.
 */
export const TRIAL_MONTHLY_CAP = 25
export const TRIAL_OMNI_CAP = 60

export function capForTier(tier: SubscriptionTier): number {
  return TIER_MONTHLY_CAPS[tier] ?? TIER_MONTHLY_CAPS.free
}

export function omniCapForTier(tier: SubscriptionTier): number {
  return TIER_OMNI_CAPS[tier] ?? TIER_OMNI_CAPS.free
}

/**
 * Cap for an effective access level. Trial users get their own volume rather
 * than inheriting the cap of the tier whose features they are borrowing.
 *
 * NOTE: a trial straddling a month boundary gets its calendar-month usage
 * window reset once mid-trial (free/trial windows are calendar months, see
 * currentPeriodWindow), so the true worst case is 2× this number. That is
 * accepted — bounding it properly would mean giving trials their own usage
 * window, which is a far larger change than the exposure justifies.
 */
export function capForAccess(
  access: EffectiveAccess,
  capTier: SubscriptionTier
): number {
  return access === 'trial' ? TRIAL_MONTHLY_CAP : capForTier(capTier)
}

export function omniCapForAccess(
  access: EffectiveAccess,
  capTier: SubscriptionTier
): number {
  return access === 'trial' ? TRIAL_OMNI_CAP : omniCapForTier(capTier)
}

/** Human label for a question cap. */
export function capLabel(tier: SubscriptionTier): string {
  return String(capForTier(tier))
}

/**
 * Marketing-facing plan name for a tier. The DB enum (free/student/scholar/
 * mastery) maps to the three paid brands: Pro / Scholar / Max.
 */
export function tierMarketingName(tier: SubscriptionTier): string {
  switch (tier) {
    case 'mastery':
      return 'Max'
    case 'scholar':
      return 'Scholar'
    case 'student':
      return 'Pro'
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
