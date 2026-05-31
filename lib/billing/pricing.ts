/**
 * Shared pricing helpers used by the checkout endpoint (price lookup) and the
 * webhook handler (reverse price -> tier/period resolution). Source of truth
 * for prices lives in the `pricing_config` table (seeded by
 * scripts/setup-stripe-products.mjs); these helpers just read it.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  BillingPeriod,
  RegionTier,
  SubscriptionTier,
} from '@/lib/database.types'

export type ProductKey =
  | 'student'
  | 'unlimited'
  | 'credits_25'
  | 'credits_100'
  | 'credits_500'

export const SUBSCRIPTION_PRODUCTS: ProductKey[] = ['student', 'unlimited']

export const CREDIT_PRODUCTS: Record<
  Exclude<ProductKey, 'student' | 'unlimited'>,
  number
> = {
  credits_25: 25,
  credits_100: 100,
  credits_500: 500,
}

export const FOUNDING_MEMBER_COUPON = 'FOUNDING_MEMBER_50'

/** Founding members get 50% off, forever. Rounded to nearest cent. */
export function applyFoundingMemberDiscount(amountCents: number): number {
  return Math.round(amountCents * 0.5)
}

export function isSubscriptionProduct(product: ProductKey): boolean {
  return SUBSCRIPTION_PRODUCTS.includes(product)
}

export function isCreditProduct(product: ProductKey): boolean {
  return product in CREDIT_PRODUCTS
}

/** Map a subscription product key to the tier it grants. */
export function tierForProduct(product: ProductKey): SubscriptionTier {
  if (product === 'student') return 'student'
  if (product === 'unlimited') return 'unlimited'
  return 'free'
}

/** Number of credits granted by a one-time credit product. */
export function creditsForProduct(product: ProductKey): number {
  return product in CREDIT_PRODUCTS
    ? CREDIT_PRODUCTS[product as keyof typeof CREDIT_PRODUCTS]
    : 0
}

export type ResolvedPrice = {
  stripe_price_id: string
  product_key: ProductKey
  currency: string
  amount_cents: number
  billing_period: BillingPeriod | null
}

/**
 * Look up the active Stripe price id for a (product, region, [period]) combo,
 * preferring the user's `currency` and falling back to USD. Returns null when
 * nothing matches (products not yet created / inactive).
 */
export async function resolvePrice(
  supabase: SupabaseClient,
  opts: {
    product: ProductKey
    regionTier: RegionTier
    currency: string
    billingPeriod?: BillingPeriod | null
  }
): Promise<ResolvedPrice | null> {
  const isSub = isSubscriptionProduct(opts.product)
  const period: BillingPeriod | null = isSub
    ? opts.billingPeriod ?? 'monthly'
    : null

  let query = supabase
    .from('pricing_config')
    .select('stripe_price_id, product_key, currency, amount_cents, billing_period')
    .eq('product_key', opts.product)
    .eq('region_tier', opts.regionTier)
    .eq('is_active', true)

  query = period === null
    ? query.is('billing_period', null)
    : query.eq('billing_period', period)

  const { data, error } = await query
  if (error || !data || data.length === 0) return null

  const preferred =
    data.find((r) => r.currency === opts.currency.toLowerCase()) ??
    data.find((r) => r.currency === 'usd') ??
    data[0]

  return {
    stripe_price_id: preferred.stripe_price_id,
    product_key: preferred.product_key as ProductKey,
    currency: preferred.currency,
    amount_cents: preferred.amount_cents,
    billing_period: preferred.billing_period as BillingPeriod | null,
  }
}

/**
 * Reverse lookup used by the webhook: given a Stripe price id, find the product
 * it represents so we can set the subscription tier/period.
 */
export async function lookupPriceConfig(
  supabase: SupabaseClient,
  stripePriceId: string
): Promise<{
  product_key: ProductKey
  tier: SubscriptionTier
  billing_period: BillingPeriod | null
} | null> {
  const { data, error } = await supabase
    .from('pricing_config')
    .select('product_key, billing_period')
    .eq('stripe_price_id', stripePriceId)
    .maybeSingle()

  if (error || !data) return null
  const product = data.product_key as ProductKey
  return {
    product_key: product,
    tier: tierForProduct(product),
    billing_period: (data.billing_period as BillingPeriod | null) ?? null,
  }
}
