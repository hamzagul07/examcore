/**
 * Display amounts using live FX (pricing page). Checkout still uses Stripe price IDs from DB.
 */
import { createServiceClient } from '@/lib/supabase/service'
import type { BillingPeriod } from '@/lib/database.types'
import type { ProductKey } from './pricing'
import { getLiveFxRates } from './fx-rates'
import { getListAmountCents } from './pricing-usd'
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

function liveAmount(
  region: RegionChoice,
  product: ProductKey,
  period: BillingPeriod | null,
  fx: Record<string, number>,
  hasDbRow: boolean
): DisplayPrice {
  return {
    amountCents: getListAmountCents({
      product,
      tier: region.tier,
      currency: region.currency,
      billingPeriod: period,
      fx,
    }),
    currency: region.currency,
    fromConfig: hasDbRow,
  }
}

function subscriptionPrices(
  rows: ConfigRow[],
  product: ProductKey,
  region: RegionChoice,
  fx: Record<string, number>
): SubscriptionDisplayPrices {
  const hasMonthly = rows.some(
    (r) => r.product_key === product && r.billing_period === 'monthly'
  )
  const hasYearly = rows.some(
    (r) => r.product_key === product && r.billing_period === 'yearly'
  )
  return {
    monthly: liveAmount(region, product, 'monthly', fx, hasMonthly),
    yearly: liveAmount(region, product, 'yearly', fx, hasYearly),
  }
}

export async function getPricingDisplay(
  region: RegionChoice
): Promise<PricingDisplay> {
  const fx = await getLiveFxRates()
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('pricing_config')
    .select('product_key, currency, amount_cents, billing_period')
    .eq('region_tier', region.tier)
    .eq('currency', region.currency)
    .eq('is_active', true)

  const rows: ConfigRow[] = (data as ConfigRow[]) ?? []
  const configured = rows.length > 0

  const creditRow = (product: ProductKey) =>
    rows.some((r) => r.product_key === product && r.billing_period === null)

  return {
    currency: region.currency,
    configured,
    student: subscriptionPrices(rows, 'student', region, fx),
    scholar: subscriptionPrices(rows, 'scholar', region, fx),
    mastery: subscriptionPrices(rows, 'mastery', region, fx),
    credits: {
      credits_25: liveAmount(region, 'credits_25', null, fx, creditRow('credits_25')),
      credits_100: liveAmount(region, 'credits_100', null, fx, creditRow('credits_100')),
      credits_500: liveAmount(region, 'credits_500', null, fx, creditRow('credits_500')),
    },
  }
}
