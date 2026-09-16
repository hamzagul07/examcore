import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { unsubscribeUrl } from '@/lib/community/email-unsubscribe'
import { sendPlanCheckinEmail } from '@/lib/email/plan-checkin'
import { decideCheckin, type CheckinSkip } from '@/lib/plan/checkin-eligibility'
import { isoDate, type DoneDays, type HydratedPlan } from '@/lib/plan/plan-view'

/**
 * The morning plan check-in batch.
 *
 * Runs hourly. One row per plan whose exam is still ahead; each plan carries
 * its student's time zone, and the email goes in their morning (07:00–11:00
 * local — see checkin-eligibility). Consent is the profile's exam-reminder
 * switch (off by default — the plan builder offers it);
 * `checkin_last_sent_at` is the dedupe. Ships OFF like every other sender:
 * without PLAN_CHECKIN_SEND=true it counts and sends nothing, so the segment
 * can be read in production before a student receives anything.
 */

const MAX_PER_RUN = Number(process.env.PLAN_CHECKIN_MAX_PER_RUN ?? 200)

function emailsEnabled(): boolean {
  return process.env.PLAN_CHECKIN_SEND === 'true'
}

export type PlanCheckinResult = {
  candidates: number
  sent: number
  skipped: Record<CheckinSkip | 'no_email' | 'send_failed', number>
  capped: boolean
  dry_run: boolean
}

export async function sendPlanCheckinBatch(now = new Date()): Promise<PlanCheckinResult> {
  const admin = createServiceClient()
  const today = isoDate(now)
  const result: PlanCheckinResult = {
    candidates: 0,
    sent: 0,
    skipped: {
      no_consent: 0,
      exam_passed: 0,
      not_morning: 0,
      recent: 0,
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
    .select('user_id, exam_date, plan, done_days, checkin_last_sent_at, time_zone')
    .gt('exam_date', today)
    .limit(2000)
  if (error) throw new Error(`study_plans scan failed: ${error.message}`)
  const plans = rows ?? []
  result.candidates = plans.length
  if (plans.length === 0) return result

  const { data: profiles } = await admin
    .from('user_profiles')
    .select('id, full_name, email_exam_reminders')
    .in(
      'id',
      plans.map((p) => p.user_id as string)
    )
  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id as string, p as { full_name: string | null; email_exam_reminders: boolean | null }])
  )

  for (const row of plans) {
    if (result.sent >= MAX_PER_RUN) {
      result.capped = true
      break
    }
    const userId = row.user_id as string
    const profile = profileById.get(userId)
    const decision = decideCheckin({
      // The column is authoritative for the zone; the JSON copy is for the page.
      plan: { ...(row.plan as HydratedPlan), timeZone: (row.time_zone as string | null) ?? 'UTC' },
      done: ((row.done_days as DoneDays | null) ?? {}) as DoneDays,
      consent: profile?.email_exam_reminders === true,
      lastSentAt: (row.checkin_last_sent_at as string | null) ?? null,
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
      progress: decision.progress,
      unsubscribeHref: unsubscribeUrl(userId, 'exam'),
    })
    if (!ok) {
      result.skipped.send_failed += 1
      continue
    }
    await admin
      .from('study_plans')
      .update({ checkin_last_sent_at: now.toISOString() })
      .eq('user_id', userId)
    result.sent += 1
  }

  return result
}
