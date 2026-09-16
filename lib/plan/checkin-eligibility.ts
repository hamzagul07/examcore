/**
 * Whether a student gets this morning's check-in, and what it says.
 *
 * Pure so the rules are testable: consent is the existing exam-reminder
 * switch, one email a day at most, never on a rest day (an email that says
 * "nothing today" is noise), never once the exam has passed.
 */

import {
  checkinLine,
  findPlanDay,
  planProgress,
  type DoneDays,
  type HydratedDay,
  type HydratedPlan,
  type PlanProgress,
} from '@/lib/plan/plan-view'

/** Two sends can't land within this window, however the cron is invoked. */
export const CHECKIN_MIN_GAP_MS = 20 * 60 * 60 * 1000

export type CheckinSkip = 'no_consent' | 'exam_passed' | 'no_day' | 'rest_day' | 'recent'

export type CheckinDecision =
  | { send: true; day: HydratedDay; line: string; progress: PlanProgress }
  | { send: false; reason: CheckinSkip }

export function decideCheckin(input: {
  plan: Pick<HydratedPlan, 'days' | 'examDate'>
  done: DoneDays
  todayIso: string
  consent: boolean
  lastSentAt: string | null
  now: Date
}): CheckinDecision {
  if (!input.consent) return { send: false, reason: 'no_consent' }
  if (input.plan.examDate <= input.todayIso) return { send: false, reason: 'exam_passed' }
  if (input.lastSentAt) {
    const last = new Date(input.lastSentAt).getTime()
    if (Number.isFinite(last) && input.now.getTime() - last < CHECKIN_MIN_GAP_MS) {
      return { send: false, reason: 'recent' }
    }
  }
  const day = findPlanDay(input.plan, input.todayIso)
  if (!day) return { send: false, reason: 'no_day' }
  if (day.kind === 'rest' || day.workMinutes === 0) return { send: false, reason: 'rest_day' }
  const progress = planProgress(input.plan, input.done, input.todayIso)
  return { send: true, day, line: checkinLine(day, progress), progress }
}
