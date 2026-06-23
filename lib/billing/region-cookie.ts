import type { RegionTier } from '@/lib/database.types'
import { getRegionTier, getPreferredCurrency } from './regions'

export const REGION_COOKIE = 'ec_region'
export const REGION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export const SUPPORTED_CURRENCIES = ['usd', 'gbp', 'eur', 'aud', 'inr', 'pkr'] as const
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

export type RegionChoice = {
  currency: SupportedCurrency
  tier: RegionTier
  country: string | null
  /** true when the user explicitly overrode region (vs. geo-detected) */
  override: boolean
}

/** Currencies offered per region tier (must match setup-stripe-products.mjs). */
export const CURRENCIES_BY_TIER: Record<RegionTier, readonly SupportedCurrency[]> = {
  A: ['usd', 'gbp', 'eur', 'aud'],
  B: ['usd', 'eur'],
  C: ['usd', 'inr', 'pkr'],
}

// Fallback tier when the currency is not sold in the preserved tier.
const CURRENCY_DEFAULT_TIER: Record<SupportedCurrency, RegionTier> = {
  usd: 'A',
  gbp: 'A',
  eur: 'A',
  aud: 'A',
  inr: 'C',
  pkr: 'C',
}

export function isSupportedCurrency(v: string | null | undefined): v is SupportedCurrency {
  return !!v && (SUPPORTED_CURRENCIES as readonly string[]).includes(v.toLowerCase())
}

export function isCurrencyInTier(currency: SupportedCurrency, tier: RegionTier): boolean {
  return (CURRENCIES_BY_TIER[tier] as readonly string[]).includes(currency)
}

/** Pick region tier for a currency, keeping geo/cookie tier when that currency is sold there. */
export function tierForCurrency(
  currency: SupportedCurrency,
  preserveTier?: RegionTier | null
): RegionTier {
  if (currency === 'pkr' || currency === 'inr') {
    return 'C'
  }
  if (
    currency === 'usd' &&
    preserveTier === 'C' &&
    (CURRENCIES_BY_TIER.C as readonly string[]).includes('usd')
  ) {
    return 'C'
  }
  if (preserveTier && isCurrencyInTier(currency, preserveTier)) {
    return preserveTier
  }
  return CURRENCY_DEFAULT_TIER[currency]
}

/** Serialize a region choice for the cookie value. */
export function serializeRegion(choice: RegionChoice): string {
  return `${choice.currency}:${choice.tier}`
}

/** Parse the cookie value back into a choice (best-effort). */
export function parseRegionCookie(raw: string | null | undefined): RegionChoice | null {
  if (!raw) return null
  const [currency, tier] = raw.split(':')
  if (!isSupportedCurrency(currency)) return null
  const t: RegionTier = tier === 'A' || tier === 'B' || tier === 'C' ? tier : 'A'
  return { currency, tier: t, country: null, override: true }
}

/** Build a choice from a manually selected currency. */
export function regionFromCurrency(
  currency: SupportedCurrency,
  opts?: { preserveTier?: RegionTier | null; country?: string | null }
): RegionChoice {
  return {
    currency,
    tier: tierForCurrency(currency, opts?.preserveTier),
    country: opts?.country ?? null,
    override: true,
  }
}

/** Build a choice from a geo country code (no override). */
export function regionFromCountry(country: string | null): RegionChoice {
  const currency = getPreferredCurrency(country)
  const safe = isSupportedCurrency(currency) ? currency : 'usd'
  const tier = getRegionTier(country)
  return {
    currency: isCurrencyInTier(safe, tier) ? safe : 'usd',
    tier,
    country,
    override: false,
  }
}

/**
 * Resolve the effective region: explicit cookie override wins, else geo header.
 * `cookieValue` from the request cookie, `country` from x-vercel-ip-country.
 */
export function resolveRegion(
  cookieValue: string | null | undefined,
  country: string | null
): RegionChoice {
  return parseRegionCookie(cookieValue) ?? regionFromCountry(country)
}
