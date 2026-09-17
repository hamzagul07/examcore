/**
 * Where the minutes in a day actually are.
 *
 * The first planner took minutes per weekday and laid 25/5 blocks into them.
 * The roadmap takes the student's real week — windows they would rather
 * study in, commitments nothing may overlap, spans (sleep, dinner) with no
 * study at all — and turns one date into free intervals, a capacity, and a
 * layout of work slots, breaks and time in hand with clock times on them.
 *
 * Capacity is one number per date: the smaller of the minutes the student
 * stated for that kind of day and the wall-clock minutes left inside their
 * windows once commitments and no-study spans are cut out. Time of day is
 * placement, not a second capacity model (docs/EXAM_ROADMAP.md §2.5).
 *
 * Every interval is minutes from local midnight, half-open [start, end), on
 * the plan's own calendar date. Windows must not cross midnight; a
 * commitment or a no-study span may, and is split into the part that ends
 * today and the part that starts tomorrow. Time zones only matter at the
 * edge, when a wall-clock time becomes an instant (zonedInstant), and that
 * is done with Intl alone so it runs in the browser and in a route handler.
 *
 * Pure and client-safe: it imports only sibling engine modules.
 */

import { weekdayIndex } from '@/lib/plan/build-study-plan'
import { isValidTimeZone } from '@/lib/plan/plan-view'
import {
  BREAK_MINUTES,
  LONG_BREAK_AFTER,
  MIN_BUFFER_MINUTES,
  MIN_DAY_MINUTES,
  UTILISATION_MAX,
  UTILISATION_TARGET,
  type BreakRhythm,
  type ClockTime,
  type DayCommitment,
  type RoadmapAvailability,
  type SessionLength,
  type TimeWindow,
} from '@/lib/plan/roadmap-types'
import type { WeekAvailability } from '@/lib/plan/build-study-plan'

/** Minutes from local midnight, half-open: 0 <= start < end <= 1440. */
export type Interval = { start: number; end: number }

const DAY_MINUTES = 1440

/** The exam is a commitment from midnight to its end; when no start time is known, until this. */
const EXAM_DAY_FREE_FROM = 18 * 60
/** A paper whose length the catalogue does not know is assumed this long. */
const DEFAULT_PAPER_MINUTES = 90
/** Travel home and a breath after the paper before anything else is placed. */
const AFTER_EXAM_MINUTES = 60

// --- clock ---------------------------------------------------------------------------

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/

export function isClockTime(s: unknown): s is ClockTime {
  return typeof s === 'string' && CLOCK.test(s)
}

/** A validated 'HH:MM' as minutes from midnight. Callers check isClockTime first. */
function clockMinute(clock: ClockTime): number {
  return Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5))
}

/** Minutes from midnight → 'HH:MM', clamped to the last minute of the day. */
function minuteClock(minute: number): ClockTime {
  const m = Math.max(0, Math.min(DAY_MINUTES - 1, Math.round(minute)))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

// --- spans and intervals -------------------------------------------------------------------

/**
 * A window or span as intervals on this day and, when it crosses midnight,
 * the next. Malformed times, equal start and end, and a crossing span where
 * crossing is not allowed (a window) all read as nothing.
 */
export function normaliseSpan(w: TimeWindow, opts: { allowCross: boolean }): { sameDay: Interval[]; nextDay: Interval[] } {
  if (!isClockTime(w.start) || !isClockTime(w.end)) return { sameDay: [], nextDay: [] }
  const start = clockMinute(w.start)
  const end = clockMinute(w.end)
  if (start === end) return { sameDay: [], nextDay: [] }
  if (start < end) return { sameDay: [{ start, end }], nextDay: [] }
  if (!opts.allowCross) return { sameDay: [], nextDay: [] }
  return { sameDay: [{ start, end: DAY_MINUTES }], nextDay: end > 0 ? [{ start: 0, end }] : [] }
}

/** Sorted, disjoint, touching pieces joined, nothing shorter than a minute. */
export function mergeIntervals(list: Interval[]): Interval[] {
  const clean = list
    .map((i) => ({ start: Math.max(0, Math.floor(i.start)), end: Math.min(DAY_MINUTES, Math.ceil(i.end)) }))
    .filter((i) => i.end - i.start >= 1)
    .sort((a, b) => a.start - b.start || a.end - b.end)
  const out: Interval[] = []
  for (const i of clean) {
    const last = out[out.length - 1]
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end)
    else out.push({ ...i })
  }
  return out
}

/** base minus cut: sorted, disjoint, every piece at least a minute. */
export function subtractIntervals(base: Interval[], cut: Interval[]): Interval[] {
  const cuts = mergeIntervals(cut)
  const out: Interval[] = []
  for (const b of mergeIntervals(base)) {
    let cursor = b.start
    for (const c of cuts) {
      if (c.end <= cursor) continue
      if (c.start >= b.end) break
      if (c.start > cursor) out.push({ start: cursor, end: c.start })
      cursor = Math.max(cursor, c.end)
      if (cursor >= b.end) break
    }
    if (cursor < b.end) out.push({ start: cursor, end: b.end })
  }
  return out.filter((i) => i.end - i.start >= 1)
}

function sumIntervals(list: Interval[]): number {
  return list.reduce((n, i) => n + (i.end - i.start), 0)
}

export function isWeekendDate(dateIso: string): boolean {
  return weekdayIndex(dateIso) >= 5
}

// --- one date ------------------------------------------------------------------------------

/**
 * The free intervals on a date: the windows for its kind of day, minus the
 * commitments that fall on that weekday, minus the after-midnight part of
 * any commitment on the previous weekday, minus every no-study span (both
 * of its parts apply to every day: the sleep that starts at 22:30 tonight
 * also ended at 07:00 this morning), minus anything the caller adds (an exam).
 */
export function dayFreeIntervals(dateIso: string, avail: RoadmapAvailability, extraCuts: Interval[] = []): Interval[] {
  const wd = weekdayIndex(dateIso)
  const prev = (wd + 6) % 7
  const windowsFor = wd >= 5 ? avail.windows.weekend : avail.windows.weekday
  const windows = mergeIntervals(windowsFor.flatMap((w) => normaliseSpan(w, { allowCross: false }).sameDay))

  const cuts: Interval[] = [...extraCuts]
  for (const c of avail.commitments) {
    const span = normaliseSpan({ start: c.start, end: c.end }, { allowCross: true })
    if (c.days.includes(wd as never)) cuts.push(...span.sameDay)
    if (c.days.includes(prev as never)) cuts.push(...span.nextDay)
  }
  for (const s of avail.noStudy) {
    const span = normaliseSpan(s, { allowCross: true })
    cuts.push(...span.sameDay, ...span.nextDay)
  }
  return subtractIntervals(windows, cuts)
}

export type DayCapacity = {
  /** The minutes the student stated for this kind of day. */
  stated: number
  intervals: Interval[]
  /** Wall-clock minutes inside the intervals. */
  raw: number
  /** min(stated, raw); 0 on a blocked date. */
  capacity: number
  commitments: DayCommitment[]
}

export type ExamOnDate = { date: string; label: string; examTime?: ClockTime; paperMinutes?: number }

/** When an exam on this date ends, as a minute of the day, plus the hour after. */
function examEndMinute(exam: ExamOnDate): number {
  if (!isClockTime(exam.examTime)) return EXAM_DAY_FREE_FROM
  return Math.min(DAY_MINUTES, clockMinute(exam.examTime) + (exam.paperMinutes ?? DEFAULT_PAPER_MINUTES) + AFTER_EXAM_MINUTES)
}

export function dayCapacity(
  dateIso: string,
  avail: RoadmapAvailability,
  blocked: ReadonlySet<string>,
  exams: ExamOnDate[]
): DayCapacity {
  const wd = weekdayIndex(dateIso)
  const stated = Math.max(0, Math.round(wd >= 5 ? avail.weekendMinutes : avail.weekdayMinutes))

  const commitments: DayCommitment[] = []
  const examCuts: Interval[] = []
  for (const e of exams) {
    if (e.date !== dateIso) continue
    const end = examEndMinute(e)
    examCuts.push({ start: 0, end })
    commitments.push({ label: e.label, start: '00:00', end: minuteClock(end), kind: 'exam' })
  }
  for (const c of avail.commitments) {
    if (!c.days.includes(wd as never)) continue
    if (!isClockTime(c.start) || !isClockTime(c.end) || c.start === c.end) continue
    commitments.push({ label: c.label, start: c.start, end: c.end, kind: c.kind })
  }

  if (blocked.has(dateIso)) return { stated, intervals: [], raw: 0, capacity: 0, commitments }

  const intervals = dayFreeIntervals(dateIso, avail, examCuts)
  const raw = sumIntervals(intervals)
  return { stated, intervals, raw, capacity: Math.min(stated, raw), commitments }
}

// --- legacy columns ---------------------------------------------------------------------------

/** A Monday-to-Sunday week used only to look up each weekday's capacity. */
const REPRESENTATIVE_WEEK = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20']

/** Minutes per weekday for the planner's WeekAvailability column: a plain week, no blocked dates, no exams. */
export function deriveWeekAvailability(avail: RoadmapAvailability): WeekAvailability {
  const none = new Set<string>()
  return REPRESENTATIVE_WEEK.map((d) => dayCapacity(d, avail, none, []).capacity) as WeekAvailability
}

/** The planner's minutesPerDay: the larger stated day, never below the floor. */
export function deriveMinutesPerDay(avail: RoadmapAvailability): number {
  return Math.max(MIN_DAY_MINUTES, Math.round(avail.weekdayMinutes), Math.round(avail.weekendMinutes))
}

// --- layout -----------------------------------------------------------------------------------

export type DaySlot = { kind: 'work' | 'break' | 'buffer'; start: number; end: number; minutes: number }

export type DayLayout = { slots: DaySlot[]; workMinutes: number; breakMinutes: number; bufferMinutes: number }

/**
 * Work slots and breaks laid into the free intervals, up to a share of the
 * capacity; the rest is time in hand.
 *
 * Slots never straddle an interval. A break only ever sits between two work
 * slots inside one interval — the gap between intervals is already a break.
 * The long break comes after LONG_BREAK_AFTER[session] work slots, and
 * degrades to a short one when the long one plus a minimum slot would no
 * longer fit. Laying stops when work plus breaks would pass utilisation ×
 * capacity; the last work slot may run over by less than minTask rather
 * than be dropped for being a few minutes short, but never past
 * UTILISATION_MAX of the capacity — so a 60-minute day lays 45, not 55.
 * Time in hand is shown as one buffer slot after the last work when it is
 * worth showing, and is always counted.
 */
export function layoutDay(
  intervals: Interval[],
  capacity: number,
  session: SessionLength,
  rhythm: BreakRhythm,
  utilisation = UTILISATION_TARGET,
  minTask = MIN_DAY_MINUTES
): DayLayout {
  const free = mergeIntervals(intervals)
  // No intervals means no day: nothing to lay and nothing in hand.
  if (free.length === 0 || capacity <= 0) return { slots: [], workMinutes: 0, breakMinutes: 0, bufferMinutes: 0 }
  const budget = Math.floor(capacity * utilisation)
  // Overshoot is allowed only up to here; a caller laying to 100% (a replan with stated minutes) has no ceiling above its budget.
  const ceiling = utilisation >= 1 ? budget : Math.max(budget, Math.floor(capacity * UTILISATION_MAX))
  const breaks = BREAK_MINUTES[rhythm]
  const longAfter = LONG_BREAK_AFTER[session]

  const slots: DaySlot[] = []
  let used = 0
  let work = 0
  let rest = 0
  let sinceLong = 0
  let lastUsed: { interval: Interval; cursor: number } | null = null

  // The next work slot, given what the interval and the budget still hold; null when nothing fits.
  const nextWork = (cursor: number, end: number, spent: number): number | null => {
    const left = end - cursor
    if (left < minTask) return null
    let w = Math.min(session, left)
    const room = budget - spent
    if (w > room) {
      if (room >= minTask) w = room
      else if (room > 0 && spent + minTask <= ceiling) w = minTask
      else return null
    }
    return w
  }

  for (const interval of free) {
    let cursor = interval.start
    let inInterval = 0
    for (;;) {
      let breakLen = 0
      let longBreak = false
      let w: number | null = null
      if (inInterval > 0) {
        longBreak = sinceLong >= longAfter
        breakLen = longBreak ? breaks.long : breaks.short
        w = nextWork(cursor + breakLen, interval.end, used + breakLen)
        // A long break that leaves no room for a slot becomes a short one rather than ending the day early.
        if (w === null && longBreak) {
          longBreak = false
          breakLen = breaks.short
          w = nextWork(cursor + breakLen, interval.end, used + breakLen)
        }
      } else {
        w = nextWork(cursor, interval.end, used)
      }
      if (w === null) break
      if (breakLen > 0) {
        slots.push({ kind: 'break', start: cursor, end: cursor + breakLen, minutes: breakLen })
        cursor += breakLen
        used += breakLen
        rest += breakLen
        if (longBreak) sinceLong = 0
      }
      slots.push({ kind: 'work', start: cursor, end: cursor + w, minutes: w })
      cursor += w
      used += w
      work += w
      inInterval += 1
      sinceLong += 1
      lastUsed = { interval, cursor }
      if (used >= budget) break
    }
    if (used >= budget) break
  }

  const bufferMinutes = Math.max(0, capacity - work - rest)
  if (bufferMinutes >= MIN_BUFFER_MINUTES) {
    const at = lastUsed ?? (free[0] ? { interval: free[0], cursor: free[0].start } : null)
    if (at) {
      const end = Math.min(at.interval.end, at.cursor + bufferMinutes)
      const minutes = end - at.cursor
      if (minutes >= MIN_BUFFER_MINUTES) slots.push({ kind: 'buffer', start: at.cursor, end, minutes })
    }
  }

  return { slots, workMinutes: work, breakMinutes: rest, bufferMinutes }
}

/** The first interval a timed paper fits in, the paper at its start, and what is left. */
export function reservePaperSlot(intervals: Interval[], paperMinutes: number): { slot: Interval; rest: Interval[] } | null {
  const free = mergeIntervals(intervals)
  const host = free.find((i) => i.end - i.start >= paperMinutes)
  if (!host || paperMinutes < 1) return null
  const slot = { start: host.start, end: host.start + paperMinutes }
  return { slot, rest: subtractIntervals(free, [slot]) }
}

// --- zones --------------------------------------------------------------------------------------

const partsFormatters = new Map<string, Intl.DateTimeFormat>()

function partsFormatter(tz: string): Intl.DateTimeFormat {
  let f = partsFormatters.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    partsFormatters.set(tz, f)
  }
  return f
}

/** The wall clock in tz at an instant, as if it were UTC — so subtracting the instant gives the offset. */
function wallAsUtcMs(ms: number, tz: string): number {
  const p: Record<string, number> = {}
  for (const part of partsFormatter(tz).formatToParts(new Date(ms))) {
    if (part.type !== 'literal') p[part.type] = Number(part.value)
  }
  return Date.UTC(p.year!, p.month! - 1, p.day!, (p.hour ?? 0) % 24, p.minute ?? 0, p.second ?? 0)
}

/**
 * The instant at which a wall-clock time happens in a zone. DST-safe without
 * a library: try the zone's offset from a day before and a day after, keep
 * the candidates whose wall clock reads back as asked. Two candidates (the
 * hour that repeats when clocks go back) → the earlier; none (the hour that
 * is skipped when clocks go forward) → the instant the skipped time maps
 * forward to, which is what a 02:30 alarm does.
 */
export function zonedInstant(dateIso: string, clock: ClockTime, tz: string): Date {
  const y = Number(dateIso.slice(0, 4))
  const mo = Number(dateIso.slice(5, 7))
  const d = Number(dateIso.slice(8, 10))
  const minute = isClockTime(clock) ? clockMinute(clock) : 0
  const wall = Date.UTC(y, mo - 1, d, Math.floor(minute / 60), minute % 60)
  if (!isValidTimeZone(tz)) return new Date(wall)

  const dayMs = 86_400_000
  const offsets = new Set<number>()
  for (const probe of [wall - dayMs, wall, wall + dayMs]) offsets.add(wallAsUtcMs(probe, tz) - probe)
  const candidates = [...offsets].map((o) => wall - o)
  const valid = candidates.filter((c) => wallAsUtcMs(c, tz) === wall)
  if (valid.length > 0) return new Date(Math.min(...valid))
  return new Date(Math.max(...candidates))
}

/** Minutes since local midnight in the student's zone (UTC when the zone is unknown). */
export function minuteOfDayInZone(tz: string, now = new Date()): number {
  if (!isValidTimeZone(tz)) return now.getUTCHours() * 60 + now.getUTCMinutes()
  let hour = 0
  let minute = 0
  for (const part of partsFormatter(tz).formatToParts(now)) {
    if (part.type === 'hour') hour = Number(part.value) % 24
    if (part.type === 'minute') minute = Number(part.value)
  }
  return hour * 60 + minute
}
