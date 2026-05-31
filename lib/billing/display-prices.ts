import { createServiceClient } from '@/lib/supabase/service'
import type { BillingPeriod } from '@/lib/database.types'
import type { ProductKey } from './pricing'
import { applyFoundingMemberDiscount } from './pricing'
import { getFallbackAmountCents } from './pricing-fallback'
import type { RegionChoice } from './region-cookie'

export type DisplayPrice = {
  amountCents: number
  currency: string
  /** false when this came from the fallback table (pricing_config not seeded) */
  fromConfig: boolean
}

export type PricingDisplay = {
  currency: string
  configured: boolean // true when pricing_config had ANY matching rows
  student: { monthly: DisplayPrice; yearly: DisplayPrice }
  unlimited: { monthly: DisplayPrice; yearly: DisplayPrice }
  credits: Record<'credits_25' | 'credits_100' | 'credits_500', DisplayPrice>
}

type ConfigRow = {
  product_key: string
  currency: string
  amount_cents: number
  billing_period: BillingPeriod | null
}

function pickAmount(
  rows: ConfigRow[],
  product: ProductKey,
  currency: string,
  period: BillingPeriod | null,
  fallback: number
): DisplayPrice {
  const match = rows.find(
    (r) =>
      r.product_key === product &&
      r.currency === currency &&
      (period === null ? r.billing_period === null : r.billing_period === period)
  )
  return match
    ? { amountCents: match.amount_cents, currency, fromConfig: true }
    : { amountCents: fallback, currency, fromConfig: false }
}

/**
 * Resolve all display prices for a region. Reads pricing_config (service role,
 * filtered by region tier + currency) and falls back to the hardcoded table for
 * any missing combination. Applies the founding-member 50% discount when
 * `founding` is true. Display only — never used to charge.
 */
export async function getPricingDisplay(
  region: RegionChoice,
  founding: boolean
): Promise<PricingDisplay> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('pricing_config')
    .select('product_key, currency, amount_cents, billing_period')
    .eq('region_tier', region.tier)
    .eq('currency', region.currency)
    .eq('is_active', true)

  const rows: ConfigRow[] = (data as ConfigRow[]) ?? []
  const configured = rows.length > 0

  const fb = (product: ProductKey, period: BillingPeriod | null) =>
    getFallbackAmountCents({
      product,
      tier: region.tier,
      currency: region.currency,
      billingPeriod: period,
    })

  const discount = (p: DisplayPrice): DisplayPrice =>
    founding ? { ...p, amountCents: applyFoundingMemberDiscount(p.amountCents) } : p

  return {
    currency: region.currency,
    configured,
    student: {
      monthly: discount(pickAmount(rows, 'student', region.currency, 'monthly', fb('student', 'monthly'))),
      yearly: discount(pickAmount(rows, 'student', region.currency, 'yearly', fb('student', 'yearly'))),
    },
    unlimited: {
      monthly: discount(pickAmount(rows, 'unlimited', region.currency, 'monthly', fb('unlimited', 'monthly'))),
      yearly: discount(pickAmount(rows, 'unlimited', region.currency, 'yearly', fb('unlimited', 'yearly'))),
    },
    credits: {
      credits_25: discount(pickAmount(rows, 'credits_25', region.currency, null, fb('credits_25', null))),
      credits_100: discount(pickAmount(rows, 'credits_100', region.currency, null, fb('credits_100', null))),
      credits_500: discount(pickAmount(rows, 'credits_500', region.currency, null, fb('credits_500', null))),
    },
  }
}
