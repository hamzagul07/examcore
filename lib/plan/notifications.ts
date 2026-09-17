import 'server-only'

/**
 * Sending a roadmap nudge to a phone. The words come from
 * lib/plan/notification-policy.ts and the decision to send from the same
 * quiet-hours and backoff rules the email uses; this module only carries
 * the result to push_to_user(), the SQL function that fans out to the
 * student's Expo tokens.
 *
 * Behind the same gate as the check-in email (PLAN_CHECKIN_SEND=true).
 * Best-effort: a push that fails is logged and forgotten, because the
 * email already went and the plan page is the source of truth.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { NOTIFICATION_COPY, backoffAllows, inQuietHours, type NotificationContext } from '@/lib/plan/notification-policy'
import type { RoadmapNotificationKind, TimeWindow } from '@/lib/plan/roadmap-types'

/** Where every roadmap push lands: the plan page, counted as a check-in open. */
export const ROADMAP_PUSH_URL = '/dashboard/plan?src=checkin'

export function roadmapSendEnabled(): boolean {
  return process.env.PLAN_CHECKIN_SEND === 'true'
}

/** True when the student has at least one registered device. */
export async function hasPushToken(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await admin.from('push_tokens').select('token').eq('user_id', userId).limit(1)
  return Boolean(data && data.length > 0)
}

export type PushDecision =
  | { send: true; title: string; body: string }
  | { send: false; reason: 'disabled' | 'quiet_hours' | 'backoff' | 'no_device' }

/**
 * Compose and, when allowed, send one push. The policy checks are repeated
 * here because a nudge that is not the morning check-in (a block ready
 * after tuition) does not go through checkin-eligibility.
 */
export async function sendRoadmapPush(
  admin: SupabaseClient,
  userId: string,
  kind: RoadmapNotificationKind,
  ctx: NotificationContext,
  policy: { minuteOfDay: number; quietHours: TimeWindow | null; unopened: number; lastSentAt: string | null; now: Date }
): Promise<PushDecision> {
  const { title, body } = NOTIFICATION_COPY[kind](ctx)
  if (!roadmapSendEnabled()) return { send: false, reason: 'disabled' }
  if (inQuietHours(policy.minuteOfDay, policy.quietHours)) return { send: false, reason: 'quiet_hours' }
  if (!backoffAllows(policy.unopened, policy.lastSentAt, policy.now)) return { send: false, reason: 'backoff' }
  if (!(await hasPushToken(admin, userId))) return { send: false, reason: 'no_device' }
  await pushToUser(admin, userId, title, body)
  return { send: true, title, body }
}

/** The raw call, for the check-in cron which has already decided. Never throws. */
export async function pushToUser(admin: SupabaseClient, userId: string, title: string, body: string): Promise<boolean> {
  try {
    const { error } = await admin.rpc('push_to_user', {
      target_user: userId,
      push_title: title,
      push_body: body,
      push_data: { url: ROADMAP_PUSH_URL },
    })
    if (error) {
      console.error('[plan] push_to_user failed', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[plan] push_to_user threw', err)
    return false
  }
}
