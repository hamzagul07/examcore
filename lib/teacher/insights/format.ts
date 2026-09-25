/**
 * Small display rules the insight pages share (roster rows, the student
 * head, the due lists). Each takes the `now` the page was computed at, so a
 * server render and the hydrated client never disagree about "today".
 *
 * Pure and dependency-free: safe in client and server components.
 */

const DAY_MS = 86_400_000

// A fixed table rather than Intl: ICU versions disagree ("Sep" / "Sept"),
// and a server render must match the browser's hydration byte for byte.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

/** "due today", "1 day overdue", "12 days overdue" — how long a topic has been waiting. */
export function dueAgeLabel(dueAt: string, nowMs: number): string {
  const due = toMs(dueAt)
  if (due === null || !Number.isFinite(nowMs)) return 'due'
  const days = Math.floor((nowMs - due) / DAY_MS)
  if (days <= 0) return 'due today'
  return `${days} ${days === 1 ? 'day' : 'days'} overdue`
}

/**
 * "today", "yesterday", "5 days ago" while it is recent, then a date
 * ("12 Sep", with the year once it is not this year). Null for no date.
 * UTC day boundaries, like the rest of the teacher system's dates.
 */
export function relativeDay(iso: string | null | undefined, nowMs: number): string | null {
  const ms = toMs(iso)
  if (ms === null || !Number.isFinite(nowMs)) return null
  const days = Math.floor(nowMs / DAY_MS) - Math.floor(ms / DAY_MS)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  return shortDate(new Date(ms).toISOString(), nowMs)
}

/** "12 Sep", or "3 Dec 2025" outside the current year (UTC). Null for no date. */
export function shortDate(iso: string | null | undefined, nowMs: number): string | null {
  const ms = toMs(iso)
  if (ms === null) return null
  const d = new Date(ms)
  const base = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
  return Number.isFinite(nowMs) && d.getUTCFullYear() === new Date(nowMs).getUTCFullYear()
    ? base
    : `${base} ${d.getUTCFullYear()}`
}

/** "Amira" from "Amira K." (a displayName) — for headings that address the student by first name. */
export function firstNameOf(display: string): string {
  return display.split(' ')[0] || display
}

/** 7 → "7", 7.5 → "7.5", 7.499 → "7.5": marks as a teacher writes them. */
export function formatMark(n: number): string {
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}
