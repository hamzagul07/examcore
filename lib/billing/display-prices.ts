import { createServiceClient } from '@/lib/supabase/service'
import type { BillingPeriod } from '@/lib/database.types'
import type { ProductKey } from './pricing'
import { getFallbackAmountCents } from './pricing-fallback'
import type { RegionChoice } from './region-cookie'

export type DisplayPrice = {
  amountCents: number
  currency: string
  fromConfig: boolean
}

export type SubscriptionDisplayPrices = {
  monthly: DisplayPrice
  yearly: DisplayPrice
}

export type PricingDisplay = {
  currency: string
  configured: boolean
  student: SubscriptionDisplayPrices
  scholar: SubscriptionDisplayPrices
  mastery: SubscriptionDisplayPrices
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
  // Prefer synced Stripe/DB amounts so display matches checkout in every currency.
  return match
    ? { amountCents: match.amount_cents, currency, fromConfig: true }
    : { amountCents: fallback, currency, fromConfig: false }
}

function subscriptionPrices(
  rows: ConfigRow[],
  product: ProductKey,
  currency: string,
  fb: (product: ProductKey, period: BillingPeriod | null) => number
): SubscriptionDisplayPrices {
  return {
    monthly: pickAmount(rows, product, currency, 'monthly', fb(product, 'monthly')),
    yearly: pickAmount(rows, product, currency, 'yearly', fb(product, 'yearly')),
  }
}

export async function getPricingDisplay(
  region: RegionChoice
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

  return {
    currency: region.currency,
    configured,
    student: subscriptionPrices(rows, 'student', region.currency, fb),
    scholar: subscriptionPrices(rows, 'scholar', region.currency, fb),
    mastery: subscriptionPrices(rows, 'mastery', region.currency, fb),
    credits: {
      credits_25: pickAmount(rows, 'credits_25', region.currency, null, fb('credits_25', null)),
      credits_100: pickAmount(rows, 'credits_100', region.currency, null, fb('credits_100', null)),
      credits_500: pickAmount(rows, 'credits_500', region.currency, null, fb('credits_500', null)),
    },
  }
}
