/**
 * Polar product mapping — the single source of truth that replaces the
 * region-aware `pricing_config` lookups from the Stripe era.
 *
 * Each logical product (tier x billing period, or a credit pack) maps to a
 * Polar product ID supplied via env. We keep the forward map (checkout: which
 * Polar product to sell) and the reverse map (webhook: what a paid Polar
 * product grants) in one table so they can never drift.
 */
import type {
  BillingPeriod,
  SubscriptionTier,
} from '@/lib/database.types'
import {
  type ProductKey,
  creditsForProduct,
  isSubscriptionProduct,
  tierForProduct,
} from '@/lib/billing/pricing'

type ProductDef = {
  /** Env var holding the Polar product ID. */
  envVar: string
  product: ProductKey
  billingPeriod: BillingPeriod | null
}

// One row per Polar product. Keep in sync with scripts/setup-polar-products.mjs.
const PRODUCT_DEFS: ProductDef[] = [
  { envVar: 'POLAR_PRODUCT_STUDENT_MONTHLY', product: 'student', billingPeriod: 'monthly' },
  { envVar: 'POLAR_PRODUCT_STUDENT_YEARLY', product: 'student', billingPeriod: 'yearly' },
  { envVar: 'POLAR_PRODUCT_SCHOLAR_MONTHLY', product: 'scholar', billingPeriod: 'monthly' },
  { envVar: 'POLAR_PRODUCT_SCHOLAR_YEARLY', product: 'scholar', billingPeriod: 'yearly' },
  { envVar: 'POLAR_PRODUCT_MASTERY_MONTHLY', product: 'mastery', billingPeriod: 'monthly' },
  { envVar: 'POLAR_PRODUCT_MASTERY_YEARLY', product: 'mastery', billingPeriod: 'yearly' },
  { envVar: 'POLAR_PRODUCT_CREDITS_25', product: 'credits_25', billingPeriod: null },
  { envVar: 'POLAR_PRODUCT_CREDITS_100', product: 'credits_100', billingPeriod: null },
  { envVar: 'POLAR_PRODUCT_CREDITS_500', product: 'credits_500', billingPeriod: null },
]

/**
 * Forward: the Polar product ID to sell for a (product, billingPeriod). Returns
 * null when the env var is unset (soft-launch — checkout responds 503).
 */
export function polarProductId(
  product: ProductKey,
  billingPeriod: BillingPeriod | null
): string | null {
  const period = isSubscriptionProduct(product)
    ? billingPeriod ?? 'monthly'
    : null
  const def = PRODUCT_DEFS.find(
    (d) => d.product === product && d.billingPeriod === period
  )
  if (!def) return null
  return process.env[def.envVar]?.trim() || null
}

export type ResolvedPolarProduct = {
  productKey: ProductKey
  tier: SubscriptionTier
  billingPeriod: BillingPeriod | null
  credits: number
  isSubscription: boolean
}

/**
 * Reverse: given a Polar product ID from a webhook, resolve what it grants.
 * Returns null for unknown products (e.g. a product created outside this app).
 */
export function resolvePolarProduct(
  polarProductId: string
): ResolvedPolarProduct | null {
  for (const def of PRODUCT_DEFS) {
    if (process.env[def.envVar]?.trim() === polarProductId) {
      return {
        productKey: def.product,
        tier: tierForProduct(def.product),
        billingPeriod: def.billingPeriod,
        credits: creditsForProduct(def.product),
        isSubscription: isSubscriptionProduct(def.product),
      }
    }
  }
  return null
}

// --- Display prices (USD cents) --------------------------------------------
// Static replacement for the region/FX-driven pricing page. Keep in sync with
// scripts/setup-polar-products.mjs.

export type SubscriptionDisplay = { monthly: number; yearly: number }

export const DISPLAY_PRICES_USD: {
  student: SubscriptionDisplay
  scholar: SubscriptionDisplay
  mastery: SubscriptionDisplay
  credits_25: number
  credits_100: number
  credits_500: number
} = {
  student: { monthly: 3300, yearly: 25900 },
  scholar: { monthly: 3300, yearly: 25900 },
  mastery: { monthly: 6250, yearly: 49100 },
  credits_25: 1000,
  credits_100: 3000,
  credits_500: 10000,
}
