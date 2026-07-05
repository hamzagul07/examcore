/**
 * Shared pricing helpers used by checkout and webhook handlers.
 */
import type { SubscriptionTier } from '@/lib/database.types'

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
