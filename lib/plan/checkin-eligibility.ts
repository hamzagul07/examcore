/**
 * Whether a student gets this morning's check-in, and what it says.
 *
 * Pure so the rules are testable: consent is the existing exam-reminder
 * switch; "morning" and "today" are read in the student's own time zone (the
 * cron runs hourly and each plan says where its student is); one email a
 * day at most; never on a rest day (an email that says "nothing today" is
 * noise); never once the exam has passed.
 *
 * The roadmap added three rules. A plan with a reminder time gets its
 * window from that time (half an hour before to three hours after) instead
 * of the fixed 07:00–11:00. Nothing is sent inside the plan's quiet hours.
 * And a student who has not opened the last few check-ins is written to
 * less often (lib/plan/notification-policy.ts) — the count resets when
 * the plan page is opened from one.
 *
 * The decision is in two halves so the cron can read the cheap columns for
 * every plan and open the plan JSON only for the few whose window is open.
 */

import {
  checkinLine,
  findPlanDay,
  hourInZone,
  isValidTimeZone,
  planProgress,
  todayInZone,
  type DoneDays,
  type HydratedDay,
  type HydratedPlan,
  type PlanProgress,
} from '@/lib/plan/plan-view'
import { minuteOfDay, normaliseDay, studiedDaysLine } from '@/lib/plan/roadmap-view'
import { backoffAllows, inQuietHours } from '@/lib/plan/notification-policy'
import type { TaskState, TimeWindow } from '@/lib/plan/roadmap-types'

/** Two sends can't land within this window, however the cron is invoked. */
export const CHECKIN_MIN_GAP_MS = 20 * 60 * 60 * 1000
/** Local hours in which the email may go: from 07:00, before 11:00. Wide
 * enough that one missed cron tick does not cost the day. */
export const CHECKIN_HOUR_FROM = 7
export const CHECKIN_HOUR_TO = 11
/** With a reminder time set: from half an hour before it, until three hours after. */
export const REMINDER_WINDOW_BEFORE_MIN = 30
export const REMINDER_WINDOW_AFTER_MIN = 3 * 60

export type CheckinSkip =
  | 'no_consent'
  | 'exam_passed'
  | 'not_morning'
  | 'recent'
  | 'quiet_hours'
  | 'backoff'
  | 'no_day'
  | 'rest_day'

export type CheckinDecision =
  | { send: true; day: HydratedDay; line: string; studiedLine: string; progress: PlanProgress; todayIso: string }
  | { send: false; reason: CheckinSkip }

/** The columns the cron reads for every plan before opening any plan JSON. */
export type CheckinWindowInput = {
  examDate: string
  timeZone?: string | null
  consent: boolean
  lastSentAt: string | null
  reminderTime?: string | null
  quietHours?: TimeWindow | null
  unopened?: number | null
  now: Date
}

export type CheckinWindowDecision = { open: true; todayIso: string } | { open: false; reason: Exclude<CheckinSkip, 'no_day' | 'rest_day'> }

/** Minutes since local midnight in the zone (UTC when unknown). */
function minuteInZone(tz: string | null | undefined, now: Date): number {
  if (!isValidTimeZone(tz)) return now.getUTCHours() * 60 + now.getUTCMinutes()
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now)
  let hour = 0
  let minute = 0
  for (const p of parts) {
    if (p.type === 'hour') hour = Number(p.value) % 24
    if (p.type === 'minute') minute = Number(p.value)
  }
  return hour * 60 + minute
}

/** The plan's own send window on this clock: reminder time ± its margins, or the legacy morning hours. */
function windowOpen(tz: string | null | undefined, reminderTime: string | null | undefined, now: Date): boolean {
  if (reminderTime && /^\d{2}:\d{2}$/.test(reminderTime)) {
    const m = minuteInZone(tz, now)
    const r = minuteOfDay(reminderTime)
    return m >= r - REMINDER_WINDOW_BEFORE_MIN && m < r + REMINDER_WINDOW_AFTER_MIN
  }
  const hour = hourInZone(tz, now)
  return hour >= CHECKIN_HOUR_FROM && hour < CHECKIN_HOUR_TO
}

/** Everything that can be decided without the plan JSON. */
export function decideCheckinWindow(input: CheckinWindowInput): CheckinWindowDecision {
  if (!input.consent) return { open: false, reason: 'no_consent' }

  const tz = input.timeZone ?? null
  const todayIso = todayInZone(tz, input.now)
  if (input.examDate <= todayIso) return { open: false, reason: 'exam_passed' }

  if (!windowOpen(tz, input.reminderTime, input.now)) return { open: false, reason: 'not_morning' }

  if (input.lastSentAt) {
    const last = new Date(input.lastSentAt).getTime()
    if (Number.isFinite(last) && input.now.getTime() - last < CHECKIN_MIN_GAP_MS) {
      return { open: false, reason: 'recent' }
    }
  }

  if (inQuietHours(minuteInZone(tz, input.now), input.quietHours ?? null)) return { open: false, reason: 'quiet_hours' }
  if (!backoffAllows(input.unopened ?? 0, input.lastSentAt, input.now)) return { open: false, reason: 'backoff' }

  return { open: true, todayIso }
}

export function decideCheckin(input: {
  plan: Pick<HydratedPlan, 'days' | 'examDate'> & { timeZone?: string | null }
  done: DoneDays
  taskState?: TaskState
  consent: boolean
  lastSentAt: string | null
  reminderTime?: string | null
  quietHours?: TimeWindow | null
  unopened?: number | null
  now: Date
}): CheckinDecision {
  const window = decideCheckinWindow({
    examDate: input.plan.examDate,
    timeZone: input.plan.timeZone,
    consent: input.consent,
    lastSentAt: input.lastSentAt,
    reminderTime: input.reminderTime,
    quietHours: input.quietHours,
    unopened: input.unopened,
    now: input.now,
  })
  if (!window.open) return { send: false, reason: window.reason }
  const { todayIso } = window

  const day = findPlanDay(input.plan, todayIso)
  if (!day) return { send: false, reason: 'no_day' }
  // An exam day with work on it (another subject's review after the paper)
  // still sends; a day with nothing on it never does.
  if (day.kind === 'rest' || day.workMinutes === 0) return { send: false, reason: 'rest_day' }

  const progress = planProgress(input.plan, input.done, todayIso)
  // No marked-work evidence here: the cron does not open every student's
  // attempts. Ticks and task state are enough for a fact about recent days.
  const studiedLine = studiedDaysLine({ days: input.plan.days.map(normaliseDay) }, input.taskState ?? {}, new Set<string>(), input.done, todayIso)
  return { send: true, day, line: checkinLine(day, progress), studiedLine, progress, todayIso }
}
