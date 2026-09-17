import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { unsubscribeUrl } from '@/lib/community/email-unsubscribe'
import { sendPlanCheckinEmail } from '@/lib/email/plan-checkin'
import { decideCheckin, decideCheckinWindow, type CheckinSkip } from '@/lib/plan/checkin-eligibility'
import { NOTIFICATION_COPY } from '@/lib/plan/notification-policy'
import { hasPushToken, pushToUser } from '@/lib/plan/notifications'
import { isoDate, type DoneDays, type HydratedPlan } from '@/lib/plan/plan-view'
import type { TaskState, TimeWindow } from '@/lib/plan/roadmap-types'

/**
 * The morning plan check-in batch.
 *
 * Runs hourly. One row per plan whose exam is still ahead; each plan carries
 * its student's time zone, and the email goes in their morning (the plan's
 * reminder time, or 07:00–11:00 local — see checkin-eligibility). Consent
 * is the profile's exam-reminder switch (off by default — the plan builder
 * offers it); `checkin_last_sent_at` is the dedupe. Ships OFF like every
 * other sender: without PLAN_CHECKIN_SEND=true it counts and sends nothing,
 * so the segment can be read in production before a student receives
 * anything.
 *
 * Two passes: the light columns for every plan decide whose window is open
 * right now, and only those plans are opened (in batches of 100) — a
 * thousand plans is a thousand JSON blobs, and at any given hour most of
 * them are asleep.
 *
 * After a real send the plan's unopened count goes up; opening the plan
 * page from the email (?src=checkin) puts it back to zero. Where the
 * student has a phone registered, the same words go as a push through
 * push_to_user(), behind the same gate.
 */

const MAX_PER_RUN = Number(process.env.PLAN_CHECKIN_MAX_PER_RUN ?? 200)
const PLAN_BATCH = 100

function emailsEnabled(): boolean {
  return process.env.PLAN_CHECKIN_SEND === 'true'
}

export type PlanCheckinResult = {
  candidates: number
  sent: number
  pushed: number
  skipped: Record<CheckinSkip | 'no_email' | 'send_failed', number>
  capped: boolean
  dry_run: boolean
}

type LightRow = {
  user_id: string
  exam_date: string
  time_zone: string | null
  checkin_last_sent_at: string | null
  reminder_time: string | null
  quiet_hours: TimeWindow | null
  notify_backoff: number | null
  checkins_unopened: number | null
}

type PlanRow = {
  user_id: string
  plan: HydratedPlan
  done_days: DoneDays | null
  task_state: TaskState | null
}

export async function sendPlanCheckinBatch(now = new Date()): Promise<PlanCheckinResult> {
  const admin = createServiceClient()
  const today = isoDate(now)
  const result: PlanCheckinResult = {
    candidates: 0,
    sent: 0,
    pushed: 0,
    skipped: {
      no_consent: 0,
      exam_passed: 0,
      not_morning: 0,
      recent: 0,
      quiet_hours: 0,
      backoff: 0,
      no_day: 0,
      rest_day: 0,
      no_email: 0,
      send_failed: 0,
    },
    capped: false,
    dry_run: !emailsEnabled(),
  }

  const { data: rows, error } = await admin
    .from('study_plans')
    .select('user_id, exam_date, time_zone, checkin_last_sent_at, reminder_time, quiet_hours, notify_backoff, checkins_unopened')
    .gt('exam_date', today)
    .limit(2000)
  if (error) throw new Error(`study_plans scan failed: ${error.message}`)
  const light = (rows ?? []) as LightRow[]
  result.candidates = light.length
  if (light.length === 0) return result

  const { data: profiles } = await admin
    .from('user_profiles')
    .select('id, full_name, email_exam_reminders')
    .in(
      'id',
      light.map((p) => p.user_id)
    )
  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id as string, p as { full_name: string | null; email_exam_reminders: boolean | null }])
  )

  // First pass: the cheap decision, no plan JSON.
  const open: LightRow[] = []
  for (const row of light) {
    const window = decideCheckinWindow({
      examDate: row.exam_date,
      // The column is authoritative for the zone; the JSON copy is for the page.
      timeZone: row.time_zone ?? 'UTC',
      consent: profileById.get(row.user_id)?.email_exam_reminders === true,
      lastSentAt: row.checkin_last_sent_at,
      reminderTime: row.reminder_time,
      quietHours: row.quiet_hours,
      unopened: row.checkins_unopened,
      now,
    })
    if (!window.open) {
      result.skipped[window.reason] += 1
      continue
    }
    open.push(row)
  }
  if (open.length === 0) return result

  // Second pass: the plans whose window is open, a hundred at a time.
  const planById = new Map<string, PlanRow>()
  for (let i = 0; i < open.length; i += PLAN_BATCH) {
    const ids = open.slice(i, i + PLAN_BATCH).map((r) => r.user_id)
    const { data: plans, error: planError } = await admin
      .from('study_plans')
      .select('user_id, plan, done_days, task_state')
      .in('user_id', ids)
    if (planError) throw new Error(`study_plans plan read failed: ${planError.message}`)
    for (const p of (plans ?? []) as PlanRow[]) planById.set(p.user_id, p)
  }

  for (const row of open) {
    if (result.sent >= MAX_PER_RUN) {
      result.capped = true
      break
    }
    const userId = row.user_id
    const profile = profileById.get(userId)
    const stored = planById.get(userId)
    if (!stored?.plan) {
      result.skipped.no_day += 1
      continue
    }
    const decision = decideCheckin({
      plan: { ...stored.plan, timeZone: row.time_zone ?? 'UTC' },
      done: (stored.done_days ?? {}) as DoneDays,
      taskState: (stored.task_state ?? {}) as TaskState,
      consent: profile?.email_exam_reminders === true,
      lastSentAt: row.checkin_last_sent_at,
      reminderTime: row.reminder_time,
      quietHours: row.quiet_hours,
      unopened: row.checkins_unopened,
      now,
    })
    if (!decision.send) {
      result.skipped[decision.reason] += 1
      continue
    }

    if (result.dry_run) {
      result.sent += 1
      continue
    }

    const { data: authData } = await admin.auth.admin.getUserById(userId)
    const email = authData?.user?.email
    if (!email) {
      result.skipped.no_email += 1
      continue
    }

    const ok = await sendPlanCheckinEmail({
      to: email,
      recipientName: profile?.full_name ?? null,
      day: decision.day,
      line: decision.line,
      studiedLine: decision.studiedLine,
      progress: decision.progress,
      unsubscribeHref: unsubscribeUrl(userId, 'exam'),
    })
    if (!ok) {
      result.skipped.send_failed += 1
      continue
    }
    await admin
      .from('study_plans')
      .update({ checkin_last_sent_at: now.toISOString(), checkins_unopened: (row.checkins_unopened ?? 0) + 1 })
      .eq('user_id', userId)
    result.sent += 1

    // The same words to the phone, where there is one. Best-effort: the
    // email is the record; a push that fails changes nothing.
    if (await hasPushToken(admin, userId)) {
      const copy = NOTIFICATION_COPY.morning_checkin({ daysLeft: decision.day.daysLeft, minutes: decision.day.workMinutes })
      if (await pushToUser(admin, userId, copy.title, copy.body)) result.pushed += 1
    }
  }

  return result
}
