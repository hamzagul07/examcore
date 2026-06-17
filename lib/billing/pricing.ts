/**
 * Shared pricing helpers used by checkout and webhook handlers.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  BillingPeriod,
  RegionTier,
  SubscriptionTier,
} from '@/lib/database.types'

export type ProductKey =
  | 'student'
  | 'scholar'
  | 'mastery'
  | 'credits_25'
  | 'credits_100'
  | 'credits_500'

export const SUBSCRIPTION_PRODUCTS: ProductKey[] = ['student', 'scholar', 'mastery']

export const CREDIT_PRODUCTS: Record<
  Exclude<ProductKey, 'student' | 'scholar' | 'mastery'>,
  number
> = {
  credits_25: 25,
  credits_100: 100,
  credits_500: 500,
}

export function isSubscriptionProduct(product: ProductKey): boolean {
  return SUBSCRIPTION_PRODUCTS.includes(product)
}

export function isCreditProduct(product: ProductKey): boolean {
  return product in CREDIT_PRODUCTS
}

export function tierForProduct(product: ProductKey): SubscriptionTier {
  if (product === 'student') return 'student'
  if (product === 'scholar') return 'scholar'
  if (product === 'mastery') return 'mastery'
  return 'free'
}

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
