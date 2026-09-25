/**
 * Dates and times on the teacher's set pages (docs/TEACHER_SYSTEM_SPEC.md §4:
 * "Fri 4pm" / "Mon 9am" due chips, due lines on set slips, the print sheet).
 *
 * A deadline is an instant; what a teacher reads is a wall-clock time in their
 * own time zone. A server component does not know that zone, so every
 * formatter here takes it explicitly: pages pass their best guess (the
 * request's IP time zone, see requestTimeZone) and <LocalTime> swaps in the
 * browser's own zone after hydration. Formatting a due date in the server's
 * zone (UTC on Vercel) would show a British teacher's "4pm" deadline as
 * "3pm" for half the year.
 *
 * The due-chip and datetime-local helpers work in the RUNTIME's local zone on
 * purpose: they only run in the browser (the composer and the extension
 * sheet), where local time is the teacher's time.
 *
 * Pure: no I/O, no clock except the `now` passed in.
 */

export const FALLBACK_TIME_ZONE = 'UTC'

const DAY_MS = 86_400_000

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
const MONTHS_LONG = [
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

/**
 * An IANA time zone Intl accepts, in its canonical spelling, or null. Used
 * for the request's `x-vercel-ip-timezone` header and the browser's own
 * zone, neither of which is trusted to be well-formed.
 */
export function safeTimeZone(candidate: unknown): string | null {
  if (typeof candidate !== 'string') return null
  const tz = candidate.trim()
  if (!tz || tz.length > 64 || !/^[A-Za-z0-9_+\-/]+$/.test(tz)) return null
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: tz }).resolvedOptions().timeZone
  } catch {
    return null
  }
}

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

type WallParts = { year: number; month: number; day: number; weekday: number; hour: number; minute: number }

const partsFormatters = new Map<string, Intl.DateTimeFormat>()

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsFormatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
      weekday: 'short',
    })
    partsFormatters.set(timeZone, f)
  }
  return f
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** The wall clock at `ms` in `timeZone` (an unusable zone reads as UTC). */
export function wallClock(ms: number, timeZone: string): WallParts {
  const tz = safeTimeZone(timeZone) ?? FALLBACK_TIME_ZONE
  const out: WallParts = { year: 1970, month: 1, day: 1, weekday: 4, hour: 0, minute: 0 }
  for (const p of partsFormatter(tz).formatToParts(new Date(ms))) {
    if (p.type === 'year') out.year = Number(p.value)
    else if (p.type === 'month') out.month = Number(p.value)
    else if (p.type === 'day') out.day = Number(p.value)
    else if (p.type === 'hour') out.hour = Number(p.value) % 24
    else if (p.type === 'minute') out.minute = Number(p.value)
    else if (p.type === 'weekday') out.weekday = WEEKDAY_INDEX[p.value] ?? out.weekday
  }
  return out
}

/** Calendar-day number of a wall date, for "today / tomorrow" arithmetic. */
function dayNumber(p: Pick<WallParts, 'year' | 'month' | 'day'>): number {
  return Math.round(Date.UTC(p.year, p.month - 1, p.day) / DAY_MS)
}

/** "4pm", "4:30pm", "12pm" (noon), "12am" (midnight). */
export function formatClock(hour: number, minute: number): string {
  const suffix = hour < 12 ? 'am' : 'pm'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return minute === 0 ? `${h12}${suffix}` : `${h12}:${String(minute).padStart(2, '0')}${suffix}`
}

/**
 * A deadline as a set slip shows it, relative to `now` in `timeZone`:
 * "Today 4pm", "Tomorrow 9am", "Yesterday 4pm", "Fri 4pm" (within the coming
 * week), otherwise "Fri 9 Oct, 4pm" (with the year when it is not this one).
 * Null for a missing or unreadable timestamp.
 */
export function formatDueShort(
  iso: string | null | undefined,
  opts: { timeZone: string; now: number }
): string | null {
  const ms = toMs(iso)
  if (ms === null) return null
  if (!Number.isFinite(opts.now)) return formatDueAbsolute(iso, opts.timeZone)
  const due = wallClock(ms, opts.timeZone)
  const today = wallClock(opts.now, opts.timeZone)
  const clock = formatClock(due.hour, due.minute)
  const diff = dayNumber(due) - dayNumber(today)
  if (diff === 0) return `Today ${clock}`
  if (diff === 1) return `Tomorrow ${clock}`
  if (diff === -1) return `Yesterday ${clock}`
  if (diff > 1 && diff < 7) return `${WEEKDAYS_SHORT[due.weekday]} ${clock}`
  const year = due.year === today.year ? '' : ` ${due.year}`
  return `${WEEKDAYS_SHORT[due.weekday]} ${due.day} ${MONTHS_SHORT[due.month - 1]}${year}, ${clock}`
}

/** "Fri 2 Oct 2026, 4pm" — no relative words, for when there is no agreed "now". */
export function formatDueAbsolute(iso: string | null | undefined, timeZone: string): string | null {
  const ms = toMs(iso)
  if (ms === null) return null
  const p = wallClock(ms, timeZone)
  return `${WEEKDAYS_SHORT[p.weekday]} ${p.day} ${MONTHS_SHORT[p.month - 1]} ${p.year}, ${formatClock(p.hour, p.minute)}`
}

/** "Friday 2 October 2026, 4pm" — unambiguous, for titles, sheets and read-backs. */
export function formatDueLong(iso: string | null | undefined, timeZone: string): string | null {
  const ms = toMs(iso)
  if (ms === null) return null
  const p = wallClock(ms, timeZone)
  return `${WEEKDAYS_LONG[p.weekday]} ${p.day} ${MONTHS_LONG[p.month - 1]} ${p.year}, ${formatClock(p.hour, p.minute)}`
}

/** "2 Oct 2026" — a date without a time (the print sheet's header). */
export function formatDate(iso: string | null | undefined, timeZone: string): string | null {
  const ms = toMs(iso)
  if (ms === null) return null
  const p = wallClock(ms, timeZone)
  return `${p.day} ${MONTHS_SHORT[p.month - 1]} ${p.year}`
}

/** "21–27 Sep", "28 Sep – 4 Oct", "29 Dec 2025 – 4 Jan 2026" for an ISO week [start, end). UTC, like the weeks. */
export function formatWeekRange(startIso: string, endIso: string): string | null {
  const start = toMs(startIso)
  const end = toMs(endIso)
  if (start === null || end === null || end <= start) return null
  const a = wallClock(start, 'UTC')
  const b = wallClock(end - 1, 'UTC')
  if (a.year !== b.year) {
    return `${a.day} ${MONTHS_SHORT[a.month - 1]} ${a.year} – ${b.day} ${MONTHS_SHORT[b.month - 1]} ${b.year}`
  }
  if (a.month !== b.month) {
    return `${a.day} ${MONTHS_SHORT[a.month - 1]} – ${b.day} ${MONTHS_SHORT[b.month - 1]}`
  }
  return `${a.day}–${b.day} ${MONTHS_SHORT[a.month - 1]}`
}

/** Whether a deadline has passed at `now` (a missing deadline never has). */
export function isPast(iso: string | null | undefined, now: number): boolean {
  const ms = toMs(iso)
  return ms !== null && ms < now
}

// ---------------------------------------------------------------------------
// Browser-local helpers: <input type="datetime-local"> and quick chips
// ---------------------------------------------------------------------------

const LOCAL_INPUT_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

/** 'YYYY-MM-DDTHH:mm' in the runtime's local zone — the value a datetime-local input takes. */
export function toLocalInputValue(date: Date | null): string {
  if (!date || !Number.isFinite(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * A datetime-local value as an instant in the runtime's local zone, or null
 * for anything that is not a real calendar date ("2026-02-30T09:00"). A wall
 * time that does not exist because the clocks went forward is moved forward
 * with them, as the browser's own picker does.
 */
export function fromLocalInputValue(value: string): Date | null {
  const m = LOCAL_INPUT_RE.exec(value.trim())
  if (!m) return null
  const [year, month, day, hour, minute] = m.slice(1).map(Number)
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59) return null
  const date = new Date(year, month - 1, day, hour, minute, 0, 0)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

/** `date` moved by `days` calendar days, keeping its local wall-clock time across a clock change. */
export function addLocalDays(date: Date, days: number): Date {
  const out = new Date(date.getTime())
  out.setDate(out.getDate() + days)
  return out
}

/**
 * The next `weekday` (0 = Sunday) at `hour:minute` local time that is at
 * least `minLeadMs` after `now`. "Fri 4pm" pressed at 3pm on a Friday means
 * next Friday, not an hour from now.
 */
export function nextWeekdayAt(
  now: Date,
  weekday: number,
  hour: number,
  minute = 0,
  minLeadMs = 12 * 60 * 60_000
): Date {
  const out = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0)
  out.setDate(out.getDate() + ((weekday - out.getDay() + 7) % 7))
  while (out.getTime() - now.getTime() < minLeadMs) out.setDate(out.getDate() + 7)
  return out
}

export type DueChip = { key: string; label: string; date: Date }

/** The composer's quick deadlines (spec §4: "Fri 4pm" / "Mon 9am"). */
export function defaultDueChips(now: Date): DueChip[] {
  return [
    { key: 'fri-4pm', label: 'Fri 4pm', date: nextWeekdayAt(now, 5, 16) },
    { key: 'mon-9am', label: 'Mon 9am', date: nextWeekdayAt(now, 1, 9) },
  ]
}

/**
 * Quick extensions from a deadline: +1 day, +3 days, +1 week, each at the same
 * wall-clock time. `base` is the later of the set's due date and any
 * extension the student already has.
 */
export function extensionChips(base: Date): DueChip[] {
  return [
    { key: 'plus-1d', label: '+1 day', date: addLocalDays(base, 1) },
    { key: 'plus-3d', label: '+3 days', date: addLocalDays(base, 3) },
    { key: 'plus-1w', label: '+1 week', date: addLocalDays(base, 7) },
  ]
}

/** Whether two instants fall in the same minute (a chip "matches" the picked time). */
export function sameMinute(a: Date | string | null, b: Date | string | null): boolean {
  const ma = a instanceof Date ? a.getTime() : toMs(a)
  const mb = b instanceof Date ? b.getTime() : toMs(b)
  if (ma === null || mb === null || !Number.isFinite(ma) || !Number.isFinite(mb)) return false
  return Math.floor(ma / 60_000) === Math.floor(mb / 60_000)
}
