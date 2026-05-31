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

// Currency -> default region tier when the user picks a currency manually.
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
export function regionFromCurrency(currency: SupportedCurrency): RegionChoice {
  return {
    currency,
    tier: CURRENCY_DEFAULT_TIER[currency],
    country: null,
    override: true,
  }
}

/** Build a choice from a geo country code (no override). */
export function regionFromCountry(country: string | null): RegionChoice {
  const currency = getPreferredCurrency(country)
  const safe = isSupportedCurrency(currency) ? currency : 'usd'
  return {
    currency: safe,
    tier: getRegionTier(country),
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
