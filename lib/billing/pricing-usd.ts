import type { BillingPeriod, RegionTier } from '@/lib/database.types'
import type { ProductKey } from './pricing'

/** USD list prices in cents (source of truth — keep in sync with setup-stripe-products.mjs). */
export const PRICING_USD = {
  student: {
    A: { monthly: 1800, yearly: 15800 },
    B: { monthly: 1000, yearly: 9000 },
    C: { monthly: 600, yearly: 5000 },
  },
  // Pro (marketing name) — competitive tier (Quizlet/Photomath/Save My Exams band).
  scholar: {
    A: { monthly: 1499, yearly: 11900 },
    B: { monthly: 999, yearly: 7900 },
    C: { monthly: 599, yearly: 4700 },
  },
  // Max (marketing name).
  mastery: {
    A: { monthly: 2999, yearly: 23900 },
    B: { monthly: 1999, yearly: 15900 },
    C: { monthly: 1199, yearly: 9500 },
  },
  credits_25: { A: 1000, B: 600, C: 400 },
  credits_100: { A: 3000, B: 1800, C: 1200 },
  credits_500: { A: 10000, B: 6000, C: 4000 },
} as const

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
  pkr: 10000,
}

const SUBSCRIPTION_KEYS = ['student', 'scholar', 'mastery'] as const

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
  return convertUsdCents(
    getBaseUsdCents({
      product: opts.product,
      tier: opts.tier,
      billingPeriod: opts.billingPeriod,
    }),
    opts.currency
  )
}
