/**
 * Idempotent Max gifts: welcome bonus on mastery activation, sprint bonus near exam_date.
 *
 * Credits use try_apply_credit_topup (or void apply_credit_topup fallback). Emails
 * fire only after a unique `*-notified` ledger claim so concurrent vault/dashboard
 * opens and Polar active+updated webhooks cannot double-send.
 */
import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  MAX_SPRINT_BONUS_CREDITS,
  MAX_SPRINT_WINDOW_DAYS,
  MAX_WELCOME_BONUS_CREDITS,
} from '@/lib/billing/features'
import { examCountdown } from '@/lib/dashboard/exam-date'
import { sendMaxWelcomeEmail } from '@/lib/email/max-welcome'
import { sendMaxSprintEmail } from '@/lib/email/max-sprint'

async function ensureGiftCredits(
  supabase: SupabaseClient,
  userId: string,
  credits: number,
  orderKey: string,
  reason: string
): Promise<boolean> {
  const metadata = {
    polar_order_id: orderKey,
    product: reason,
    source: 'max_gift',
  }

  const { error } = await supabase.rpc('try_apply_credit_topup', {
    p_user_id: userId,
    p_credits: credits,
    p_metadata: metadata,
  })

  if (error) {
    if (error.message?.includes('try_apply_credit_topup') || error.code === 'PGRST202') {
      const { error: fallbackErr } = await supabase.rpc('apply_credit_topup', {
        p_user_id: userId,
        p_credits: credits,
        p_metadata: metadata,
      })
      if (fallbackErr) {
        console.error(`[max-gifts] ${reason} fallback grant failed:`, fallbackErr.message)
        return false
      }
    } else {
      console.error(`[max-gifts] ${reason} credit grant failed:`, error.message)
      return false
    }
  }

  const { data: after } = await supabase
    .from('usage_events')
    .select('id')
    .eq('event_type', 'credit_topup')
    .eq('user_id', userId)
    .contains('metadata', { polar_order_id: orderKey })
    .maybeSingle()
  return !!after
}

/** Unique claim so only one caller emails for this gift. */
async function claimGiftEmail(
  supabase: SupabaseClient,
  userId: string,
  orderKey: string,
  reason: string
): Promise<boolean> {
  const { error } = await supabase.from('usage_events').insert({
    user_id: userId,
    event_type: 'credit_grant',
    credits_delta: 0,
    source: 'admin_grant',
    metadata: {
      polar_order_id: `${orderKey}-notified`,
      product: reason,
      source: 'max_gift_email_claim',
    },
  })
  return !error
}

/** Returns true only when this caller should send the gift email. */
async function grantBonusCredits(
  supabase: SupabaseClient,
  userId: string,
  credits: number,
  orderKey: string,
  reason: string
): Promise<boolean> {
  const credited = await ensureGiftCredits(supabase, userId, credits, orderKey, reason)
  if (!credited) return false
  return claimGiftEmail(supabase, userId, orderKey, reason)
}

/** Call when Polar syncs Max (mastery) on subscription.active or .updated. */
export async function grantMaxWelcomeGift(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const orderKey = `max-welcome-${userId}`
  const granted = await grantBonusCredits(
    supabase,
    userId,
    MAX_WELCOME_BONUS_CREDITS,
    orderKey,
    'max_welcome_bonus'
  )
  if (!granted) return

  const { data: authData } = await supabase.auth.admin.getUserById(userId)
  const email = authData?.user?.email
  if (!email) return

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle()

  sendMaxWelcomeEmail({
    to: email,
    recipientName: (profile?.full_name as string | null) ?? null,
    bonusCredits: MAX_WELCOME_BONUS_CREDITS,
    creditsGranted: true,
  })
}

/**
 * When a Max user opens the vault/dashboard and exam_date is within the sprint
 * window, grant +15 credits once and email the sprint unlock.
 */
export async function maybeGrantMaxSprintGift(
  supabase: SupabaseClient,
  userId: string,
  examDate: string | null | undefined
): Promise<{ unlocked: boolean; grantedCredits: boolean }> {
  const countdown = examCountdown(examDate)
  if (countdown.kind !== 'future' || countdown.daysLeft > MAX_SPRINT_WINDOW_DAYS) {
    return { unlocked: false, grantedCredits: false }
  }

  const orderKey = `max-sprint-${userId}`
  const granted = await grantBonusCredits(
    supabase,
    userId,
    MAX_SPRINT_BONUS_CREDITS,
    orderKey,
    'max_sprint_bonus'
  )

  if (granted) {
    const { data: authData } = await supabase.auth.admin.getUserById(userId)
    const email = authData?.user?.email
    if (email) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle()
      sendMaxSprintEmail({
        to: email,
        recipientName: (profile?.full_name as string | null) ?? null,
        daysLeft: countdown.daysLeft,
        bonusCredits: MAX_SPRINT_BONUS_CREDITS,
      })
    }
  }

  return { unlocked: true, grantedCredits: granted }
}
