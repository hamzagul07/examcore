import type { BillingPeriod, RegionTier } from '@/lib/database.types'
import type { ProductKey } from './pricing'

/**
 * Tier C subscription prices are anchored to exact PKR amounts (Pakistan list price).
 * USD and INR are derived at 100 PKR = $1 so Rs 3,700/month displays as $37/month —
 * students see consistent numbers when switching currency on /pricing.
 */
export const TIER_C_PKR_PER_USD = 100

/** USD list prices in cents (tiers A/B + credits — keep in sync with setup-stripe-products.mjs). */
export const PRICING_USD = {
  student: {
    A: { monthly: 3300, yearly: 25900 },
    B: { monthly: 2200, yearly: 17300 },
    C: { monthly: 3700, yearly: 29030 },
  },
  scholar: {
    A: { monthly: 3300, yearly: 25900 },
    B: { monthly: 2200, yearly: 17300 },
    C: { monthly: 3700, yearly: 29030 },
  },
  mastery: {
    A: { monthly: 6250, yearly: 49100 },
    B: { monthly: 4170, yearly: 32700 },
    C: { monthly: 6999, yearly: 54910 },
  },
  credits_25: { A: 1000, B: 600, C: 400 },
  credits_100: { A: 3000, B: 1800, C: 1200 },
  credits_500: { A: 10000, B: 6000, C: 4000 },
} as const

/** Exact PKR amounts for region tier C (Pakistan). Source of truth for tier C subs. */
export const PRICING_PKR_C: Record<
  (typeof SUBSCRIPTION_KEYS)[number],
  { monthly: number; yearly: number }
> = {
  student: { monthly: 370_000, yearly: 2_903_000 },
  scholar: { monthly: 370_000, yearly: 2_903_000 },
  mastery: { monthly: 699_900, yearly: 5_491_000 },
}

export const PRICING_FX: Record<string, number> = {
  usd: 1,
  gbp: 0.79,
  eur: 0.92,
  aud: 1.52,
  inr: 83,
  pkr: 280,
}

export const PRICING_ROUND_TO_CENTS: Record<string, number> = {
  usd: 1,
  gbp: 1,
  eur: 1,
  aud: 1,
  inr: 100,
  pkr: 100,
}

const SUBSCRIPTION_KEYS = ['student', 'scholar', 'mastery'] as const

const TIER_C_CURRENCIES = new Set(['usd', 'inr', 'pkr'])

/** Derive tier C subscription amount from PKR anchor (paisa) for USD / INR / PKR. */
export function tierCAmountFromPkrAnchor(
  pkrCents: number,
  currency: string
): number {
  const cur = currency.toLowerCase()
  if (cur === 'pkr') return pkrCents

  const usdCents = Math.max(1, Math.round(pkrCents / TIER_C_PKR_PER_USD))
  if (cur === 'usd') return usdCents

  if (cur === 'inr') {
    const raw = usdCents * (PRICING_FX.inr ?? 83)
    const unit = PRICING_ROUND_TO_CENTS.inr
    return Math.max(unit, Math.round(raw / unit) * unit)
  }

  return convertUsdCents(usdCents, cur)
}

export function convertUsdCents(usdCents: number, currency: string): number {
  const cur = currency.toLowerCase()
  const raw = usdCents * (PRICING_FX[cur] ?? 1)
  const unit = PRICING_ROUND_TO_CENTS[cur] ?? 1
  return Math.max(unit, Math.round(raw / unit) * unit)
}

export function getBaseUsdCents(opts: {
  product: ProductKey
  tier: RegionTier
  billingPeriod?: BillingPeriod | null
}): number {
  const { product, tier } = opts
  if (SUBSCRIPTION_KEYS.includes(product as (typeof SUBSCRIPTION_KEYS)[number])) {
    const period = opts.billingPeriod === 'yearly' ? 'yearly' : 'monthly'
    return PRICING_USD[product as (typeof SUBSCRIPTION_KEYS)[number]][tier][period]
  }
  return PRICING_USD[product as 'credits_25' | 'credits_100' | 'credits_500'][tier]
}

export function getListAmountCents(opts: {
  product: ProductKey
  tier: RegionTier
  currency: string
  billingPeriod?: BillingPeriod | null
}): number {
  const cur = opts.currency.toLowerCase()
  const period = opts.billingPeriod === 'yearly' ? 'yearly' : 'monthly'

  if (
    opts.tier === 'C' &&
    SUBSCRIPTION_KEYS.includes(opts.product as (typeof SUBSCRIPTION_KEYS)[number]) &&
    TIER_C_CURRENCIES.has(cur)
  ) {
    const pkrCents =
      PRICING_PKR_C[opts.product as (typeof SUBSCRIPTION_KEYS)[number]][period]
    return tierCAmountFromPkrAnchor(pkrCents, cur)
  }

  return convertUsdCents(
    getBaseUsdCents({
      product: opts.product,
      tier: opts.tier,
      billingPeriod: opts.billingPeriod,
    }),
    opts.currency
  )
}
