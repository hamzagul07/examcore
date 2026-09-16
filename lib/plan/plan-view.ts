/**
 * The shapes a saved plan takes once hydrated with real links, and the pure
 * helpers the page, the dashboard card and the morning check-in share for
 * reading it: which day is today, how far along the student is, what to say.
 *
 * Kept free of server imports so the client can use it and the tests can run
 * without --conditions=react-server.
 */

import { examEncouragement } from '@/lib/dashboard/exam-date'
import type { PlanBlock, PlanDay, StudyPlan } from '@/lib/plan/build-study-plan'

export type HydratedBlock = PlanBlock & {
  /** Where the block starts — a real question, a paper, the review queue. */
  href?: string
  /** What the link opens, e.g. "Q7 · 9709/12 May/June 2023". */
  resourceLabel?: string
}

export type HydratedDay = Omit<PlanDay, 'blocks'> & { blocks: HydratedBlock[] }

export type HydratedPlan = Omit<StudyPlan, 'days'> & {
  days: HydratedDay[]
  /** ISO timestamp the plan was generated — shown so a stale plan reads as one. */
  generatedAt: string
}

/** Day number (as a string key) → ticked off. */
export type DoneDays = Record<string, boolean>

/** ISO date for a Date, in the caller's chosen frame (UTC by default). */
export function isoDate(d: Date, local = false): string {
  if (!local) return d.toISOString().slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** True when Intl knows the zone. Anything else falls back to UTC. */
export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz || tz.length > 64) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/**
 * The calendar date in the student's zone. A student in Karachi opening the
 * dashboard at 07:00 is still on yesterday's UTC date; their plan day is not.
 */
export function todayInZone(tz: string | null | undefined, now = new Date()): string {
  if (!isValidTimeZone(tz)) return isoDate(now)
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** The hour (0–23) in the student's zone. */
export function hourInZone(tz: string | null | undefined, now = new Date()): number {
  if (!isValidTimeZone(tz)) return now.getUTCHours()
  const h = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(now)
  return Number(h) % 24
}

/**
 * The plan day that falls on `todayIso`, or null when today is outside the
 * plan. A plan built yesterday for tomorrow's exam has no day for the exam
 * itself — that is deliberate; the exam is not a plan day.
 */
export function findPlanDay(plan: Pick<HydratedPlan, 'days'>, todayIso: string): HydratedDay | null {
  return plan.days.find((d) => d.date === todayIso) ?? null
}

export type PlanProgress = {
  /** Days that carried work and whose date is before today. */
  scheduled: number
  /** Of those, ticked off. */
  done: number
  /** Of those, not ticked off. */
  behind: number
  /** All work days across the plan. */
  totalWorkDays: number
  /** Ticked-off work days, whether past or not. */
  totalDone: number
}

export function planProgress(
  plan: Pick<HydratedPlan, 'days'>,
  done: DoneDays,
  todayIso: string
): PlanProgress {
  let scheduled = 0
  let doneCount = 0
  let totalWorkDays = 0
  let totalDone = 0
  for (const d of plan.days) {
    if (d.workMinutes === 0) continue
    totalWorkDays += 1
    const ticked = done[String(d.day)] === true
    if (ticked) totalDone += 1
    if (d.date < todayIso) {
      scheduled += 1
      if (ticked) doneCount += 1
    }
  }
  return {
    scheduled,
    done: doneCount,
    behind: scheduled - doneCount,
    totalWorkDays,
    totalDone,
  }
}

/**
 * One honest sentence for the top of today. Says how the student is doing
 * against their own plan, and never scolds — a plan the student is behind on
 * is a plan they are still opening.
 */
export function checkinLine(day: HydratedDay, progress: PlanProgress): string {
  if (day.kind === 'rest') return 'Rest day. Nothing scheduled — that is the plan working, not slipping.'
  if (day.kind === 'review') {
    return day.daysLeft === 1
      ? 'Tomorrow. Light review, then stop — sleep is revision too.'
      : 'Review only from here. Nothing new; re-read the ink on your marked answers.'
  }
  if (progress.behind >= 3) {
    return `You're ${progress.behind} days behind the plan. Don't catch up — today's blocks are the whole job.`
  }
  if (progress.behind > 0) {
    return `One or two days slipped. Today's blocks are enough; the plan already has slack in it.`
  }
  if (progress.done >= 3) {
    return `${progress.done} days done, none missed. ${examEncouragement(day.daysLeft)}`
  }
  return examEncouragement(day.daysLeft)
}

/** "Wed 16 Sep" from an ISO date, timezone-proof. */
export function formatPlanDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

/** "1 h 30 min" / "45 min" for the day header. */
export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** The blocks a student actually does — breaks and rest lines excluded. */
export function workBlocks(day: Pick<HydratedDay, 'blocks'>): HydratedBlock[] {
  return day.blocks.filter((b) => b.kind !== 'break' && b.kind !== 'rest')
}
