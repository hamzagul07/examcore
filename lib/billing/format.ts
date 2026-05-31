const CURRENCY_LOCALE: Record<string, string> = {
  usd: 'en-US',
  gbp: 'en-GB',
  eur: 'en-IE',
  aud: 'en-AU',
  inr: 'en-IN',
  pkr: 'en-PK',
}

/** Format integer cents in the given ISO currency, no trailing .00 for whole amounts. */
export function formatMoney(cents: number, currency: string): string {
  const cur = currency.toUpperCase()
  const locale = CURRENCY_LOCALE[currency.toLowerCase()] ?? 'en-US'
  const amount = cents / 100
  const hasFraction = Math.round(amount * 100) % 100 !== 0
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: hasFraction ? 2 : 0,
    }).format(amount)
  } catch {
    return `${cur} ${amount.toFixed(hasFraction ? 2 : 0)}`
  }
}
