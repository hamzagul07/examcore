/**
 * Display fallback when pricing_config has no row for a product/currency combo.
 */
import type { BillingPeriod, RegionTier } from '@/lib/database.types'
import type { ProductKey } from './pricing'
import { getListAmountCents } from './pricing-usd'

export function getFallbackAmountCents(opts: {
  product: ProductKey
  tier: RegionTier
  currency: string
  billingPeriod?: BillingPeriod | null
}): number {
  return getListAmountCents(opts)
}
