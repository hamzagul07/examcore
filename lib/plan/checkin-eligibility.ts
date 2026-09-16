/**
 * Whether a student gets this morning's check-in, and what it says.
 *
 * Pure so the rules are testable: consent is the existing exam-reminder
 * switch; "morning" and "today" are read in the student's own time zone (the
 * cron runs hourly and each plan says where its student is); one email a
 * day at most; never on a rest day (an email that says "nothing today" is
 * noise); never once the exam has passed.
 */

import {
  checkinLine,
  findPlanDay,
  hourInZone,
  planProgress,
  todayInZone,
  type DoneDays,
  type HydratedDay,
  type HydratedPlan,
  type PlanProgress,
} from '@/lib/plan/plan-view'

/** Two sends can't land within this window, however the cron is invoked. */
export const CHECKIN_MIN_GAP_MS = 20 * 60 * 60 * 1000
/** Local hours in which the email may go: from 07:00, before 11:00. Wide
 * enough that one missed cron tick does not cost the day. */
export const CHECKIN_HOUR_FROM = 7
export const CHECKIN_HOUR_TO = 11

export type CheckinSkip = 'no_consent' | 'exam_passed' | 'not_morning' | 'recent' | 'no_day' | 'rest_day'

export type CheckinDecision =
  | { send: true; day: HydratedDay; line: string; progress: PlanProgress; todayIso: string }
  | { send: false; reason: CheckinSkip }

export function decideCheckin(input: {
  plan: Pick<HydratedPlan, 'days' | 'examDate'> & { timeZone?: string | null }
  done: DoneDays
  consent: boolean
  lastSentAt: string | null
  now: Date
}): CheckinDecision {
  if (!input.consent) return { send: false, reason: 'no_consent' }

  const tz = input.plan.timeZone ?? null
  const todayIso = todayInZone(tz, input.now)
  if (input.plan.examDate <= todayIso) return { send: false, reason: 'exam_passed' }

  const hour = hourInZone(tz, input.now)
  if (hour < CHECKIN_HOUR_FROM || hour >= CHECKIN_HOUR_TO) return { send: false, reason: 'not_morning' }

  if (input.lastSentAt) {
    const last = new Date(input.lastSentAt).getTime()
    if (Number.isFinite(last) && input.now.getTime() - last < CHECKIN_MIN_GAP_MS) {
      return { send: false, reason: 'recent' }
    }
  }

  const day = findPlanDay(input.plan, todayIso)
  if (!day) return { send: false, reason: 'no_day' }
  if (day.kind === 'rest' || day.workMinutes === 0) return { send: false, reason: 'rest_day' }

  const progress = planProgress(input.plan, input.done, todayIso)
  return { send: true, day, line: checkinLine(day, progress), progress, todayIso }
}
