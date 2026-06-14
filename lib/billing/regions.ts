/**
 * Region detection for regional pricing. Tiers map a country to a price band;
 * currency maps a country to its preferred display/charge currency. Both fall
 * back to the safe defaults (Tier A / USD) when the country is unknown — we'd
 * rather charge the higher price than under-charge by mistake.
 */

export type RegionTier = 'A' | 'B' | 'C'

const TIER_A = ['US', 'CA', 'GB', 'AU', 'NZ', 'SG', 'AE', 'HK', 'JP', 'KR',
                'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO',
                'DK', 'FI', 'IE', 'LU', 'IS']

const TIER_B = ['PL', 'CZ', 'HU', 'RO', 'BG', 'GR', 'PT', 'TR', 'MX', 'BR',
                'AR', 'CL', 'CO', 'PE', 'VE', 'MY', 'TH', 'PH', 'ID', 'VN',
                'SA', 'KW', 'QA', 'BH', 'OM', 'JO', 'LB', 'IL', 'ZA']

const TIER_C = ['IN', 'PK', 'BD', 'LK', 'NP', 'NG', 'EG', 'KE', 'GH', 'ET',
                'TZ', 'UG', 'MA', 'DZ', 'TN']

export function getRegionTier(countryCode: string | undefined | null): RegionTier {
  if (!countryCode) return 'A' // safe default
  const cc = countryCode.toUpperCase()
  if (TIER_C.includes(cc)) return 'C'
  if (TIER_B.includes(cc)) return 'B'
  if (TIER_A.includes(cc)) return 'A'
  return 'A'
}

export function getPreferredCurrency(countryCode: string | undefined | null): string {
  if (!countryCode) return 'usd'
  const cc = countryCode.toUpperCase()
  const map: Record<string, string> = {
    GB: 'gbp', AU: 'aud', NZ: 'nzd',
    IN: 'inr', PK: 'pkr',
    DE: 'eur', FR: 'eur', IT: 'eur', ES: 'eur', NL: 'eur', BE: 'eur',
    AT: 'eur', IE: 'eur', PT: 'eur', GR: 'eur', FI: 'eur', LU: 'eur',
  }
  return map[cc] || 'usd'
}

// Get region from Vercel's geo header (server-side only)
export function getRegionFromRequest(req: Request): {
  country: string | null
  tier: RegionTier
  currency: string
} {
  const country = req.headers.get('x-vercel-ip-country') || null
  return {
    country,
    tier: getRegionTier(country),
    currency: getPreferredCurrency(country),
  }
}
