/**
 * Dates and counts shown in the UI, formatted identically on the server and in
 * every browser.
 *
 * `toLocaleDateString(undefined, …)` and `toLocaleString()` use the runtime's
 * locale and zone: Node renders "Sep 26" while a browser set to en-GB renders
 * "26 Sept", and one set to de-DE renders 1.669 for 1,669 — each a hydration
 * mismatch in a client component. Even a fixed locale is not enough for month
 * names, because ICU versions disagree ("Sep" / "Sept"). So Intl is only asked
 * for numeric parts in the given zone, which every version agrees on, and the
 * words come from a fixed table — the same rule as lib/teacher/insights/format.
 * The zone is the caller's, from useDisplayTimeZone.
 */

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
const LONG_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export type DisplayDateStyle = {
  /** "Sep" or "September". Default 'short'. */
  month?: 'short' | 'long'
  /** Append the year. Default true. */
  year?: boolean
}

function partsIn(ms: number, timeZone: string): { day: number; month: number; year: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date(ms))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { day: get('day'), month: get('month') - 1, year: get('year') }
}

/**
 * "5 Sep 2026" (default), "5 Sep", "5 September", "5 September 2026".
 * '' for a missing or unparseable date, so callers can fall back without a throw.
 */
export function formatDisplayDate(
  value: string | number | Date | null | undefined,
  style: DisplayDateStyle = {},
  timeZone = 'UTC'
): string {
  if (value == null || value === '') return ''
  const ms = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value)
  if (!Number.isFinite(ms)) return ''
  let p: { day: number; month: number; year: number }
  try {
    p = partsIn(ms, timeZone)
  } catch {
    // An unknown zone name (an old browser's): UTC rather than a blank.
    p = partsIn(ms, 'UTC')
  }
  const month = (style.month === 'long' ? LONG_MONTHS : SHORT_MONTHS)[p.month]
  return style.year === false ? `${p.day} ${month}` : `${p.day} ${month} ${p.year}`
}

/** 1669 → "1,669" everywhere, whatever the reader's locale. */
export function formatDisplayNumber(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
