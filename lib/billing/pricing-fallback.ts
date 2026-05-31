/**
 * Display-only fallback prices, used when `pricing_config` is empty (i.e. the
 * Stripe setup script hasn't run yet during soft launch). These mirror the
 * numbers in scripts/setup-stripe-products.mjs so the pricing page renders
 * sensible amounts. They are NEVER used to charge — checkout always uses real
 * Stripe price ids from pricing_config and returns `pricing_not_configured`
 * until the script runs.
 */
import type { BillingPeriod, RegionTier } from '@/lib/database.types'
import type { ProductKey } from './pricing'

// USD cents
const PRICING_USD = {
  student: {
    A: { monthly: 900, yearly: 7900 },
    B: { monthly: 500, yearly: 4500 },
    C: { monthly: 300, yearly: 2500 },
  },
  unlimited: {
    A: { monthly: 1900, yearly: 14900 },
    B: { monthly: 1100, yearly: 8900 },
    C: { monthly: 700, yearly: 5500 },
  },
  credits_25: { A: 500, B: 300, C: 200 },
  credits_100: { A: 1500, B: 900, C: 600 },
  credits_500: { A: 5000, B: 3000, C: 2000 },
} as const

const FX: Record<string, number> = {
  usd: 1,
  gbp: 0.79,
  eur: 0.92,
  aud: 1.52,
  inr: 83,
  pkr: 280,
}
const ROUND_TO_CENTS: Record<string, number> = {
  usd: 1,
  gbp: 1,
  eur: 1,
  aud: 1,
  inr: 100,
  pkr: 10000,
}

function convert(usdCents: number, currency: string): number {
  const raw = usdCents * (FX[currency] ?? 1)
  const unit = ROUND_TO_CENTS[currency] ?? 1
  return Math.max(unit, Math.round(raw / unit) * unit)
}

export function getFallbackAmountCents(opts: {
  product: ProductKey
  tier: RegionTier
  currency: string
  billingPeriod?: BillingPeriod | null
}): number {
  const { product, tier, currency } = opts
  let usd: number
  if (product === 'student' || product === 'unlimited') {
    const period = opts.billingPeriod === 'yearly' ? 'yearly' : 'monthly'
    usd = PRICING_USD[product][tier][period]
  } else {
    usd = PRICING_USD[product][tier]
  }
  return convert(usd, currency.toLowerCase())
}
