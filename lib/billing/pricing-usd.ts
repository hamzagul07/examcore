import type { BillingPeriod, RegionTier } from '@/lib/database.types'
import type { ProductKey } from './pricing'

/**
 * Tier C subscriptions: exact PKR list prices (Pakistan), USD derived from PKR/FX.
 * Tier A GBP/EUR/AUD and tier C INR use fixed list prices (keep in sync with setup-stripe-products.mjs).
 */

/** USD list prices in cents (tiers A/B + credits — keep in sync with setup-stripe-products.mjs). */
export const PRICING_USD = {
  student: {
    A: { monthly: 3300, yearly: 25900 },
    B: { monthly: 2200, yearly: 17300 },
    C: { monthly: 1331, yearly: 10446 },
  },
  scholar: {
    A: { monthly: 3300, yearly: 25900 },
    B: { monthly: 2200, yearly: 17300 },
    C: { monthly: 1331, yearly: 10446 },
  },
  mastery: {
    A: { monthly: 6250, yearly: 49100 },
    B: { monthly: 4170, yearly: 32700 },
    C: { monthly: 2518, yearly: 19752 },
  },
  credits_25: { A: 1000, B: 600, C: 400 },
  credits_100: { A: 3000, B: 1800, C: 1200 },
  credits_500: { A: 10000, B: 6000, C: 4000 },
} as const

/** Exact PKR amounts for region tier C (Pakistan), in paisa. Source of truth for tier C subs. */
export const PRICING_PKR_C: Record<
  (typeof SUBSCRIPTION_KEYS)[number],
  { monthly: number; yearly: number }
> = {
  student: { monthly: 370_000, yearly: 2_903_000 },
  scholar: { monthly: 370_000, yearly: 2_903_000 },
  mastery: { monthly: 699_900, yearly: 5_491_000 },
}

/** Tier A student/scholar — fixed list prices in minor units (not FX-derived). */
export const PRICING_FIXED_A: Record<
  'gbp' | 'eur' | 'aud',
  { monthly: number; yearly: number }
> = {
  gbp: { monthly: 1300, yearly: 10200 },
  eur: { monthly: 1300, yearly: 10200 },
  aud: { monthly: 2000, yearly: 15700 },
}

/** Tier C student/scholar INR (paisa). Yearly uses same PKR annual ratio as PRICING_PKR_C. */
export const PRICING_INR_C: Record<'student' | 'scholar', { monthly: number; yearly: number }> = {
  student: { monthly: 230_000, yearly: 1_804_700 },
  scholar: { monthly: 230_000, yearly: 1_804_700 },
}

/** Units of each currency per 1 USD (fallback — setup-stripe-products.mjs fetches live FX). */
export const PRICING_FX: Record<string, number> = {
  usd: 1,
  gbp: 0.79,
  eur: 0.92,
  aud: 1.52,
  inr: 95,
  pkr: 278,
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
const FIXED_A_CURRENCIES = new Set(['gbp', 'eur', 'aud'])
const FIXED_SUBSCRIPTION_PRODUCTS = new Set<ProductKey>(['student', 'scholar'])

/** PKR paisa → USD cents using PKR/USD rate. */
export function usdCentsFromPkrAnchor(pkrCents: number, pkrPerUsd = PRICING_FX.pkr): number {
  return Math.max(1, Math.round(pkrCents / pkrPerUsd))
}

/** Derive tier C subscription amount from PKR anchor for USD / INR / PKR. */
export function tierCAmountFromPkrAnchor(
  pkrCents: number,
  currency: string,
  fx: Record<string, number> = PRICING_FX
): number {
  const cur = currency.toLowerCase()
  if (cur === 'pkr') return pkrCents

  const usdCents = usdCentsFromPkrAnchor(pkrCents, fx.pkr ?? PRICING_FX.pkr)
  if (cur === 'usd') return usdCents

  return convertUsdCents(usdCents, cur, fx)
}

export function convertUsdCents(
  usdCents: number,
  currency: string,
  fx: Record<string, number> = PRICING_FX
): number {
  const cur = currency.toLowerCase()
  const raw = usdCents * (fx[cur] ?? 1)
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
  fx?: Record<string, number>
}): number {
  const fx = opts.fx ?? PRICING_FX
  const cur = opts.currency.toLowerCase()
  const period = opts.billingPeriod === 'yearly' ? 'yearly' : 'monthly'

  if (
    opts.tier === 'A' &&
    FIXED_SUBSCRIPTION_PRODUCTS.has(opts.product) &&
    FIXED_A_CURRENCIES.has(cur)
  ) {
    return PRICING_FIXED_A[cur as keyof typeof PRICING_FIXED_A][period]
  }

  if (
    opts.tier === 'C' &&
    FIXED_SUBSCRIPTION_PRODUCTS.has(opts.product) &&
    cur === 'inr'
  ) {
    return PRICING_INR_C[opts.product as 'student' | 'scholar'][period]
  }

  if (
    opts.tier === 'C' &&
    SUBSCRIPTION_KEYS.includes(opts.product as (typeof SUBSCRIPTION_KEYS)[number]) &&
    TIER_C_CURRENCIES.has(cur)
  ) {
    const pkrCents =
      PRICING_PKR_C[opts.product as (typeof SUBSCRIPTION_KEYS)[number]][period]
    return tierCAmountFromPkrAnchor(pkrCents, cur, fx)
  }

  return convertUsdCents(
    getBaseUsdCents({
      product: opts.product,
      tier: opts.tier,
      billingPeriod: opts.billingPeriod,
    }),
    opts.currency,
    fx
  )
}
