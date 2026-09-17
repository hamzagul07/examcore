/**
 * The clock in the plan's zone.
 *
 * "Now" on the roadmap is minutes since midnight in the PLAN's time zone,
 * never the browser's or the server's: a plan built in Karachi read from a
 * laptop in London at 16:00 BST is at 20:00 on its own timeline, and the
 * hero must say what is left of that evening, not this one. plan-view has
 * hourInZone; the minute matters too (India and Nepal sit on half- and
 * quarter-hour offsets), so both come from Intl here.
 */

import { hourInZone, isValidTimeZone } from '@/lib/plan/plan-view'

export function nowMinuteInZone(tz: string | null | undefined, now = new Date()): number {
  if (!isValidTimeZone(tz)) return now.getUTCHours() * 60 + now.getUTCMinutes()
  const hour = hourInZone(tz, now)
  const minutePart = new Intl.DateTimeFormat('en-GB', { timeZone: tz, minute: '2-digit' })
    .formatToParts(now)
    .find((p) => p.type === 'minute')
  const minute = Number(minutePart?.value ?? now.getUTCMinutes())
  return Math.min(1439, hour * 60 + (Number.isFinite(minute) ? minute : 0))
}
