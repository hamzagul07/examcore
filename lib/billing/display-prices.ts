/**
 * Display amounts for the pricing page.
 *
 * Polar (Merchant of Record) presents a single USD list price converted to the
 * buyer's local currency at checkout, so we no longer compute region/FX-adjusted
 * amounts here — we surface the static USD list prices from lib/polar/products.
 * The `region` param is accepted for call-site compatibility but ignored.
 */
import { DISPLAY_PRICES_USD } from '@/lib/polar/products'
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

const usd = (amountCents: number): DisplayPrice => ({
  amountCents,
  currency: 'usd',
  fromConfig: true,
})

const subUsd = (p: { monthly: number; yearly: number }): SubscriptionDisplayPrices => ({
  monthly: usd(p.monthly),
  yearly: usd(p.yearly),
})

export async function getPricingDisplay(
  _region?: RegionChoice
): Promise<PricingDisplay> {
  return {
    currency: 'usd',
    configured: true,
    student: subUsd(DISPLAY_PRICES_USD.student),
    scholar: subUsd(DISPLAY_PRICES_USD.scholar),
    mastery: subUsd(DISPLAY_PRICES_USD.mastery),
    credits: {
      credits_25: usd(DISPLAY_PRICES_USD.credits_25),
      credits_100: usd(DISPLAY_PRICES_USD.credits_100),
      credits_500: usd(DISPLAY_PRICES_USD.credits_500),
    },
  }
}
