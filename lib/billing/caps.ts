import type { SubscriptionTier } from '@/lib/database.types'

/**
 * Monthly mark caps per tier. 1 mark = 1 single question OR 1 whole paper.
 * `Infinity` for unlimited. Centralized so UI and API agree.
 *
 * This module is import-safe on the client (no server-only deps).
 */
export const TIER_MONTHLY_CAPS: Record<SubscriptionTier, number> = {
  free: 5,
  student: 100,
  unlimited: Infinity,
}

export function capForTier(tier: SubscriptionTier): number {
  return TIER_MONTHLY_CAPS[tier] ?? TIER_MONTHLY_CAPS.free
}

export function isUnlimited(tier: SubscriptionTier): boolean {
  return !Number.isFinite(capForTier(tier))
}

/** Human label for a cap (∞ for unlimited). */
export function capLabel(tier: SubscriptionTier): string {
  return isUnlimited(tier) ? '∞' : String(capForTier(tier))
}

/**
 * Current usage window for a tier. Subscribers use their Stripe period;
 * free users use the calendar month. Returns ISO strings (or null end for
 * open-ended). `source` is the usage_events.source we count against.
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
  // Free tier (or subscriber without period dates yet): calendar month.
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    source: opts.tier === 'free' ? 'free_tier' : 'subscription',
  }
}
