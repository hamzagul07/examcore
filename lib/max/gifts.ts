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
  withinMaxWelcomeClawbackWindow,
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
  const orderKey = maxWelcomeOrderKey(userId)
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

/** The ledger key the welcome gift is granted (and clawed back) under. */
function maxWelcomeOrderKey(userId: string): string {
  return `max-welcome-${userId}`
}

/**
 * Take the welcome credits back when the Max subscription is revoked soon
 * after they were given (a refund or chargeback, in practice).
 *
 * The gift was never clawed back at all: buy Max, collect 25 credits, refund,
 * keep the credits. Reversed through apply_credit_refund under the gift's own
 * ledger key, which makes it idempotent — a redelivered `subscription.revoked`
 * finds the reversal already recorded — and floors at the current balance, so
 * credits already spent are simply gone. Only inside the clawback window (see
 * MAX_WELCOME_CLAWBACK_DAYS); a longer-standing customer keeps the gift.
 */
export async function clawBackMaxWelcomeGift(
  supabase: SupabaseClient,
  userId: string,
  opts: { revokedAt?: Date } = {}
): Promise<{ clawedBack: boolean; reason?: 'never_granted' | 'outside_window' }> {
  const orderKey = maxWelcomeOrderKey(userId)
  const { data: grant, error: lookupErr } = await supabase
    .from('usage_events')
    .select('created_at')
    .eq('event_type', 'credit_topup')
    .eq('user_id', userId)
    .contains('metadata', { polar_order_id: orderKey })
    .maybeSingle()
  if (lookupErr) {
    console.error('[max-gifts] welcome clawback lookup failed:', lookupErr.message)
    return { clawedBack: false }
  }
  if (!grant) return { clawedBack: false, reason: 'never_granted' }

  const revokedAt = opts.revokedAt ?? new Date()
  if (!withinMaxWelcomeClawbackWindow(grant.created_at as string, revokedAt)) {
    return { clawedBack: false, reason: 'outside_window' }
  }

  const { error } = await supabase.rpc('apply_credit_refund', {
    p_user_id: userId,
    p_credits: MAX_WELCOME_BONUS_CREDITS,
    p_metadata: {
      polar_order_id: orderKey,
      product: 'max_welcome_bonus',
      source: 'max_gift',
      reason: 'subscription_revoked',
      revoked_at: revokedAt.toISOString(),
    },
  })
  if (error) {
    console.error('[max-gifts] welcome clawback failed:', error.message)
    return { clawedBack: false }
  }
  return { clawedBack: true }
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
