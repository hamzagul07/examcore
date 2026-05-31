/**
 * Display-only fallback prices when pricing_config is empty.
 */
import type { BillingPeriod, RegionTier } from '@/lib/database.types'
import type { ProductKey } from './pricing'

const PRICING_USD = {
  student: {
    A: { monthly: 900, yearly: 7900 },
    B: { monthly: 500, yearly: 4500 },
    C: { monthly: 300, yearly: 2500 },
  },
  scholar: {
    A: { monthly: 1900, yearly: 14900 },
    B: { monthly: 1100, yearly: 8900 },
    C: { monthly: 700, yearly: 5500 },
  },
  mastery: {
    A: { monthly: 3900, yearly: 32900 },
    B: { monthly: 2200, yearly: 18900 },
    C: { monthly: 1500, yearly: 12900 },
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

const SUBSCRIPTION_KEYS = ['student', 'scholar', 'mastery'] as const

export function getFallbackAmountCents(opts: {
  product: ProductKey
  tier: RegionTier
  currency: string
  billingPeriod?: BillingPeriod | null
}): number {
  const { product, tier, currency } = opts
  let usd: number
  if (SUBSCRIPTION_KEYS.includes(product as (typeof SUBSCRIPTION_KEYS)[number])) {
    const period = opts.billingPeriod === 'yearly' ? 'yearly' : 'monthly'
    usd = PRICING_USD[product as (typeof SUBSCRIPTION_KEYS)[number]][tier][period]
  } else {
    usd = PRICING_USD[product as 'credits_25' | 'credits_100' | 'credits_500'][tier]
  }
  return convert(usd, currency.toLowerCase())
}
