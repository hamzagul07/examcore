/**
 * When the roadmap may speak, and what it says.
 *
 * Pure, so the rules run in a test and in the client's preview alike:
 * quiet hours (which may cross midnight), the backoff schedule for a
 * student who has stopped opening check-ins, and the copy for each kind of
 * nudge. The cron (lib/plan/checkin.ts) and the push sender
 * (lib/plan/notifications.ts) call these; neither adds a word of its own.
 *
 * Backoff exists because a reminder nobody opens is a reason to turn
 * reminders off. After three unopened check-ins the roadmap writes every
 * other day; after six, weekly; the count resets the moment the plan page
 * is opened from one. The words in FORBIDDEN_NUDGE_WORDS never appear here —
 * a test pins that.
 */

import { minuteOfDay } from '@/lib/plan/roadmap-view'
import type { RoadmapNotificationKind, TimeWindow } from '@/lib/plan/roadmap-types'

const HOUR_MS = 60 * 60 * 1000

/**
 * Gaps between sends by how many check-ins went unopened. Each is four hours
 * short of the round number so an hourly cron that fires a little early
 * does not skip a whole day (the same slack as CHECKIN_MIN_GAP_MS).
 */
export const BACKOFF_DAILY_UNTIL = 3
export const BACKOFF_WEEKLY_FROM = 6
export const BACKOFF_GAP_MS = {
  daily: 20 * HOUR_MS,
  everyOtherDay: 44 * HOUR_MS,
  weekly: 164 * HOUR_MS,
} as const

/** True when the minute falls inside the window. A window whose end is before its start crosses midnight. */
export function inQuietHours(minuteOfDayNow: number, quiet: TimeWindow | null | undefined): boolean {
  if (!quiet) return false
  const start = minuteOfDay(quiet.start)
  const end = minuteOfDay(quiet.end)
  if (start === end) return false
  const m = Math.max(0, Math.min(1439, Math.floor(minuteOfDayNow)))
  if (start < end) return m >= start && m < end
  // Crosses midnight: [start, 24:00) today or [00:00, end) tomorrow.
  return m >= start || m < end
}

/** The gap the backoff schedule wants before the next send, by unopened count. */
export function backoffGapMs(unopened: number): number {
  const n = Math.max(0, Math.floor(unopened))
  if (n >= BACKOFF_WEEKLY_FROM) return BACKOFF_GAP_MS.weekly
  if (n >= BACKOFF_DAILY_UNTIL) return BACKOFF_GAP_MS.everyOtherDay
  return BACKOFF_GAP_MS.daily
}

/**
 * Whether the schedule allows a send now. 0–2 unopened: daily; 3–5: every
 * other day; 6 or more: weekly. Nothing sent yet, or a timestamp that does
 * not parse, always allows — a corrupt value must never block forever.
 */
export function backoffAllows(unopened: number, lastSentAt: string | null, now: Date): boolean {
  if (!lastSentAt) return true
  const last = new Date(lastSentAt).getTime()
  if (!Number.isFinite(last)) return true
  return now.getTime() - last >= backoffGapMs(unopened)
}

export type NotificationContext = {
  minutes?: number
  subject?: string
  /** For after_commitment: what just ended, e.g. "Tuition". */
  label?: string
  endsAt?: string
  topic?: string
  daysLeft?: number
}

function minutesWord(n: number | undefined): string {
  const m = Math.max(0, Math.round(n ?? 0))
  return `${m}-minute`
}

/**
 * Title and body per kind. Templates and numbers only: no topic content,
 * no marker output, nothing about other students, nothing about what was
 * not done.
 */
export const NOTIFICATION_COPY: Record<RoadmapNotificationKind, (ctx: NotificationContext) => { title: string; body: string }> = {
  block_ready: (ctx) => ({
    title: ctx.subject ? `${ctx.subject} block ready` : 'Your next block is ready',
    body: ctx.subject
      ? `Your ${minutesWord(ctx.minutes)} ${ctx.subject} block is ready when you are.`
      : `Your ${minutesWord(ctx.minutes)} block is ready when you are.`,
  }),
  after_commitment: (ctx) => ({
    title: 'A shorter block is ready',
    body: `${ctx.label ?? 'Your commitment'} ends at ${ctx.endsAt ?? 'the usual time'} — your shorter revision block is ready.`,
  }),
  adjusted_after_busy_day: () => ({
    title: 'Today was rebuilt',
    body: 'Yesterday was busy, so today was rebuilt around what matters most. Nothing stacked up — open today to see what changed.',
  }),
  milestone_close: (ctx) => ({
    title: ctx.subject ? `${ctx.subject}: nearly there` : 'Nearly there',
    body: 'One must-cover topic left before your next milestone — open the plan to start it.',
  }),
  morning_checkin: (ctx) => {
    const days = ctx.daysLeft
    const countdown = days === 1 ? 'Exam tomorrow' : days !== undefined ? `${days} days to go` : "Today's plan"
    const onPlan = ctx.minutes && ctx.minutes > 0 ? `${Math.round(ctx.minutes)} min on the plan today.` : 'Open the plan when you are ready.'
    return {
      title: days === 1 ? 'Tomorrow. Light review, then stop.' : countdown,
      body: days === 1 ? 'A short review today, then rest. Sleep is revision too.' : onPlan,
    }
  },
}
