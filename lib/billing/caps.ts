import type { SubscriptionTier } from '@/lib/database.types'

/**
 * Monthly question caps per tier. 1 question = 1 single question OR 1 whole paper.
 * Centralized so UI and API agree. Client-safe (no server-only deps).
 */
export const TIER_MONTHLY_CAPS: Record<SubscriptionTier, number> = {
  free: 5,
  student: 50,
  scholar: 150,
  mastery: 400,
}

/** Monthly in-app Omni AI message caps per tier (landing demo chat is not metered). */
export const TIER_OMNI_CAPS: Record<SubscriptionTier, number> = {
  free: 10,
  student: 100,
  scholar: 300,
  mastery: 2000,
}

export function capForTier(tier: SubscriptionTier): number {
  return TIER_MONTHLY_CAPS[tier] ?? TIER_MONTHLY_CAPS.free
}

export function omniCapForTier(tier: SubscriptionTier): number {
  return TIER_OMNI_CAPS[tier] ?? TIER_OMNI_CAPS.free
}

/** Human label for a question cap. */
export function capLabel(tier: SubscriptionTier): string {
  return String(capForTier(tier))
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
