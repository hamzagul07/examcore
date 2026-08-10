/**
 * Max post-purchase drip: vault tour (~24h) + day-4 first-mark coach.
 *
 * Eligibility is keyed off the idempotent welcome email claim
 * (`max-welcome-{userId}-notified` in usage_events). Sends are claimed the
 * same way so overlapping crons cannot double-mail.
 *
 * Tour + day-4 ship OFF until MAX_LIFECYCLE_EMAIL_SEND=true (dry-run counts).
 * Sprint grants always run (same gift as a Vault visit — idempotent).
 */
import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendMaxDay4Email } from '@/lib/email/max-day4'
import { sendMaxVaultTourEmail } from '@/lib/email/max-vault-tour'
import { maybeGrantMaxSprintGift } from '@/lib/max/gifts'
import {
  isEligibleForMaxDay4,
  isEligibleForMaxTour,
} from '@/lib/max/lifecycle-timing'
import { getSubjectById } from '@/lib/profile-options'
import { createServiceClient } from '@/lib/supabase-server'

const MAX_PER_RUN = Number(process.env.MAX_LIFECYCLE_MAX_PER_RUN ?? 40)

function dripEmailsEnabled(): boolean {
  return process.env.MAX_LIFECYCLE_EMAIL_SEND === 'true'
}

function focusLabelFromSubjects(
  subjects: string[] | null | undefined,
  level: string | null | undefined
): string | null {
  for (const id of subjects ?? []) {
    const opt = getSubjectById(id, level ?? undefined)
    const label = opt?.label?.trim() || id.trim()
    if (label) return label
  }
  return null
}

async function claimLifecycleEmail(
  supabase: SupabaseClient,
  userId: string,
  kind: 'tour' | 'day4'
): Promise<boolean> {
  const { error } = await supabase.from('usage_events').insert({
    user_id: userId,
    event_type: 'credit_grant',
    credits_delta: 0,
    source: 'admin_grant',
    metadata: {
      polar_order_id: `max-lifecycle-${kind}-${userId}-notified`,
      product: `max_lifecycle_${kind}`,
      source: 'max_lifecycle_email_claim',
    },
  })
  return !error
}

async function hasLifecycleClaim(
  supabase: SupabaseClient,
  userId: string,
  kind: 'tour' | 'day4'
): Promise<boolean> {
  const { data } = await supabase
    .from('usage_events')
    .select('id')
    .eq('user_id', userId)
    .eq('event_type', 'credit_grant')
    .contains('metadata', {
      polar_order_id: `max-lifecycle-${kind}-${userId}-notified`,
    })
    .maybeSingle()
  return !!data
}

async function getWelcomeClaimAt(
  supabase: SupabaseClient,
  userId: string
): Promise<Date | null> {
  const { data } = await supabase
    .from('usage_events')
    .select('created_at')
    .eq('user_id', userId)
    .eq('event_type', 'credit_grant')
    .contains('metadata', {
      polar_order_id: `max-welcome-${userId}-notified`,
    })
    .maybeSingle()
  if (!data?.created_at) return null
  return new Date(data.created_at as string)
}

export type MaxLifecycleBatchResult = {
  considered: number
  tour_sent: number
  day4_sent: number
  sprint_unlocked: number
  skipped: number
  dry_run: boolean
  capped: boolean
}

/** Daily Max lifecycle + sprint window grants. */
export async function sendMaxLifecycleBatch(): Promise<MaxLifecycleBatchResult> {
  const admin = createServiceClient()
  const now = new Date()
  const dryRun = !dripEmailsEnabled()

  const result: MaxLifecycleBatchResult = {
    considered: 0,
    tour_sent: 0,
    day4_sent: 0,
    sprint_unlocked: 0,
    skipped: 0,
    dry_run: dryRun,
    capped: false,
  }

  const { data: subs, error } = await admin
    .from('user_subscriptions')
    .select('user_id')
    .eq('tier', 'mastery')
    .in('status', ['active', 'trialing', 'past_due'])

  if (error) {
    console.error('[max-lifecycle] subscription query failed:', error)
    return result
  }

  let actions = 0

  for (const sub of subs ?? []) {
    if (actions >= MAX_PER_RUN) {
      result.capped = true
      break
    }

    const userId = sub.user_id as string
    result.considered++

    const welcomeAt = await getWelcomeClaimAt(admin, userId)
    if (!welcomeAt) {
      result.skipped++
      // Still try sprint if they somehow have Max without welcome claim
      // (older accounts / gift edge cases) — sprint uses its own ledger.
    }

    const { data: profile } = await admin
      .from('user_profiles')
      .select('full_name, subjects, board, level, target_grade, exam_date')
      .eq('id', userId)
      .maybeSingle()

    const examDate = (profile?.exam_date as string | null) ?? null

    // Sprint: always grant+email in the exam window (idempotent; no drip flag).
    const sprint = await maybeGrantMaxSprintGift(admin, userId, examDate)
    if (sprint.grantedCredits) {
      result.sprint_unlocked++
      actions++
    }

    if (!welcomeAt) continue

    const { data: authData } = await admin.auth.admin.getUserById(userId)
    const email = authData?.user?.email
    if (!email || !authData.user?.email_confirmed_at) {
      result.skipped++
      continue
    }

    const recipientName = (profile?.full_name as string | null) ?? null
    const subjects = (profile?.subjects as string[] | null) ?? null
    const level = (profile?.level as string | null) ?? null
    const focus = focusLabelFromSubjects(subjects, level)

    // --- Vault tour (~24h) ---
    const tourClaimed = await hasLifecycleClaim(admin, userId, 'tour')
    if (
      isEligibleForMaxTour({
        welcomeAt,
        now,
        alreadySent: tourClaimed,
      })
    ) {
      if (!dryRun) {
        const claimed = await claimLifecycleEmail(admin, userId, 'tour')
        if (claimed) {
          sendMaxVaultTourEmail({
            to: email,
            recipientName,
            subjects,
            board: (profile?.board as string | null) ?? null,
            level,
            targetGrade: (profile?.target_grade as string | null) ?? null,
          })
          result.tour_sent++
          actions++
        }
      } else {
        result.tour_sent++
        actions++
      }
    }

    // --- Day-4 first mark / payoff ---
    const day4Claimed = await hasLifecycleClaim(admin, userId, 'day4')
    if (
      isEligibleForMaxDay4({
        welcomeAt,
        now,
        alreadySent: day4Claimed,
      })
    ) {
      const { count: markCount } = await admin
        .from('attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (!dryRun) {
        const claimed = await claimLifecycleEmail(admin, userId, 'day4')
        if (claimed) {
          sendMaxDay4Email({
            to: email,
            recipientName,
            hasMarked: (markCount ?? 0) > 0,
            focusSubject: focus,
          })
          result.day4_sent++
          actions++
        }
      } else {
        result.day4_sent++
        actions++
      }
    }
  }

  return result
}
