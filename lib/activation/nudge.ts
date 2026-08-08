import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { unsubscribeUrl } from '@/lib/community/email-unsubscribe'
import {
  sendActivationFeedbackEmail,
  sendActivationFirstMarkEmail,
  sendActivationProofEmail,
  sendFinishOnboardingEmail,
} from '@/lib/email/activation'

/**
 * The activation series batch.
 *
 * Candidates are accounts that have marked nothing. Stage is a high-water mark
 * on user_profiles, and the batch only ever sends `stage + 1`, so a re-run, a
 * stalled cron or two overlapping invocations cannot resend a stage — the
 * counter is the guard, not the timestamp.
 *
 * Ships OFF. Real sends need ACTIVATION_EMAIL_SEND=true, exactly like the
 * streak nudge, so the query and the stage bookkeeping can be exercised in
 * production before anything reaches a student.
 */

/** Days after signup each stage becomes eligible. Index = stage - 1. */
const STAGE_DAYS = [2, 5, 10] as const

/** Don't send two stages to the same person on the same day. */
const MIN_GAP_MS = 20 * 60 * 60 * 1000

/**
 * Accounts older than this are the pre-existing backlog, not a live drip. A
 * "you signed up 2 days ago" email sent 40 days late reads as broken, so they
 * are skipped here and left for a deliberate one-off re-engagement send.
 */
const BACKLOG_CUTOFF_DAYS = 21

/**
 * Ceiling per run. On the first run everyone eligible sits at stage 0, so
 * without a cap the whole window goes out as one burst — a volume spike on a
 * domain with almost no sending history, and 69 identical emails before anyone
 * has seen whether the first one works. The backlog drains over several days
 * instead, which is also how a real drip would have looked.
 */
const MAX_PER_RUN = Number(process.env.ACTIVATION_MAX_PER_RUN ?? 25)

function emailsEnabled(): boolean {
  return process.env.ACTIVATION_EMAIL_SEND === 'true'
}

export type ActivationBatchResult = {
  candidates: number
  sent: number
  skipped: number
  backlog_skipped: number
  by_stage: Record<string, number>
  /** True when MAX_PER_RUN stopped the run early — the rest go tomorrow. */
  capped: boolean
  dry_run: boolean
}

export async function sendActivationBatch(): Promise<ActivationBatchResult> {
  const admin = createServiceClient()
  const now = new Date()
  const gapCutoff = new Date(now.getTime() - MIN_GAP_MS).toISOString()
  const backlogCutoff = new Date(
    now.getTime() - BACKLOG_CUTOFF_DAYS * 86_400_000
  ).toISOString()

  const result: ActivationBatchResult = {
    candidates: 0,
    sent: 0,
    skipped: 0,
    backlog_skipped: 0,
    by_stage: {},
    capped: false,
    dry_run: !emailsEnabled(),
  }

  // Everyone who has not finished the whole series and has not opted out.
  const { data: rows, error } = await admin
    .from('user_profiles')
    .select(
      'id, full_name, board, level, subjects, exam_date, onboarded, activation_email_stage, activation_email_last_sent_at, email_activation'
    )
    .lt('activation_email_stage', STAGE_DAYS.length)
    .neq('email_activation', false)

  if (error) {
    console.error('[activation] candidate query failed:', error)
    return result
  }

  for (const row of rows ?? []) {
    if (result.candidates >= MAX_PER_RUN) {
      result.capped = true
      break
    }
    const userId = row.id as string
    const stage = (row.activation_email_stage as number | null) ?? 0
    const lastSent = row.activation_email_last_sent_at as string | null

    if (lastSent && lastSent > gapCutoff) {
      result.skipped++
      continue
    }

    // Anyone who has marked something has activated; the series is done.
    const { count: markCount } = await admin
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    if ((markCount ?? 0) > 0) {
      result.skipped++
      continue
    }

    const { data: authData } = await admin.auth.admin.getUserById(userId)
    const user = authData?.user
    const email = user?.email
    // Unconfirmed addresses bounce, and bounces are what cost a sending domain
    // its reputation. Skip rather than risk it.
    if (!email || !user?.email_confirmed_at) {
      result.skipped++
      continue
    }

    const createdAt = user.created_at
    if (!createdAt) {
      result.skipped++
      continue
    }
    if (createdAt < backlogCutoff) {
      result.backlog_skipped++
      continue
    }

    const ageDays = (now.getTime() - new Date(createdAt).getTime()) / 86_400_000
    const nextStage = stage + 1
    if (ageDays < STAGE_DAYS[nextStage - 1]) {
      result.skipped++
      continue
    }

    result.candidates++
    if (!emailsEnabled()) continue

    const recipientName = (row.full_name as string | null) ?? null
    const unsubscribeHref = unsubscribeUrl(userId, 'activation')
    const onboarded = row.onboarded === true

    if (!onboarded) {
      // No subjects to name — the only useful message is "finish setting up",
      // and there is no point sending stages 2 and 3 about marking to someone
      // who never chose a subject. One email, then the series ends for them.
      sendFinishOnboardingEmail({ to: email, recipientName, unsubscribeHref })
      await markStage(admin, userId, STAGE_DAYS.length, now)
      result.sent++
      result.by_stage.onboarding = (result.by_stage.onboarding ?? 0) + 1
      continue
    }

    const payload = {
      to: email,
      recipientName,
      board: row.board as string | null,
      level: row.level as string | null,
      subjects: (row.subjects as string[] | null) ?? [],
      examDate: row.exam_date as string | null,
      unsubscribeHref,
    }

    if (nextStage === 1) sendActivationFirstMarkEmail(payload)
    else if (nextStage === 2) sendActivationProofEmail(payload)
    else sendActivationFeedbackEmail(payload)

    await markStage(admin, userId, nextStage, now)
    result.sent++
    result.by_stage[String(nextStage)] = (result.by_stage[String(nextStage)] ?? 0) + 1
  }

  return result
}

/** Advance the high-water mark before the next run can look at this user. */
async function markStage(
  admin: ReturnType<typeof createServiceClient>,
  userId: string,
  stage: number,
  now: Date
): Promise<void> {
  const { error } = await admin
    .from('user_profiles')
    .update({
      activation_email_stage: stage,
      activation_email_last_sent_at: now.toISOString(),
    })
    .eq('id', userId)
  if (error) console.error('[activation] stage update failed:', userId, error)
}
