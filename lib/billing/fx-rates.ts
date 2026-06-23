import { PRICING_FX } from '@/lib/billing/pricing-usd'

const FX_API = 'https://open.er-api.com/v6/latest/USD'
const LIVE_CURRENCIES = ['gbp', 'eur', 'aud', 'inr', 'pkr'] as const

export type FxRates = Record<string, number>

/** Cached live USD-based FX (1 USD → N units of each currency). Falls back to PRICING_FX. */
export async function getLiveFxRates(): Promise<FxRates> {
  const fx: FxRates = { ...PRICING_FX }

  try {
    const res = await fetch(FX_API, { next: { revalidate: 3600 } })
    if (!res.ok) return fx
    const data = (await res.json()) as {
      result?: string
      rates?: Record<string, number>
    }
    if (data.result !== 'success' || !data.rates) return fx

    for (const cur of LIVE_CURRENCIES) {
      const rate = data.rates[cur.toUpperCase()]
      if (typeof rate === 'number' && rate > 0) {
        fx[cur] = rate
      }
    }
  } catch {
    // keep static fallback
  }

  return fx
}
