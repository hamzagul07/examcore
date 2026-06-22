import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import {
  DEFAULT_BOARD,
  DEFAULT_LEVEL,
  DEFAULT_SUBJECTS,
} from '@/lib/profile-options'
import { isOnboardingComplete } from '@/lib/onboarding'
import { computeBillingSummary } from '@/lib/billing/enforcement'
import { shouldShowApproachingLimitBanner } from '@/lib/billing/enforcement-mode'
import type { SettingsContext } from './types'

export async function loadAccountContext(): Promise<SettingsContext> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select(
      'full_name, username, board, level, subjects, onboarded, onboarding_completed, exam_date, stage, primary_goal, created_at, email_exam_reminders, email_product_updates, email_community_replies, email_community_digest'
    )
    .eq('id', user.id)
    .maybeSingle()

  if (profile && !isOnboardingComplete(profile)) {
    redirect('/onboarding')
  }

  const [{ data: subscription }, { data: credits }, { data: recentUsage }, billing] =
    await Promise.all([
      supabase
        .from('user_subscriptions')
        .select(
          'tier, status, billing_period, current_period_end, cancel_at_period_end, stripe_customer_id, founding_member'
        )
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.from('user_credits').select('balance').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('usage_events')
        .select('id, event_type, source, credits_delta, created_at')
        .eq('user_id', user.id)
        .in('event_type', ['mark_single', 'mark_whole_paper', 'omni_message'])
        .order('created_at', { ascending: false })
        .limit(10),
      computeBillingSummary(user.id),
    ])

  return {
    email: user.email ?? '',
    profile: {
      full_name: profile?.full_name ?? '',
      username: (profile?.username as string | null) ?? '',
      board: profile?.board ?? DEFAULT_BOARD,
      level: profile?.level ?? DEFAULT_LEVEL,
      subjects: profile?.subjects ?? DEFAULT_SUBJECTS,
      exam_date: (profile?.exam_date as string | null) ?? '',
      stage: (profile?.stage as SettingsContext['profile']['stage']) ?? null,
      primary_goal: (profile?.primary_goal as SettingsContext['profile']['primary_goal']) ?? null,
      created_at: (profile?.created_at as string | null) ?? user.created_at ?? null,
    },
    billing: {
      tier: subscription?.tier ?? 'free',
      status: subscription?.status ?? 'active',
      billingPeriod: subscription?.billing_period ?? null,
      currentPeriodEnd: subscription?.current_period_end ?? null,
      cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
      hasCustomer: Boolean(subscription?.stripe_customer_id),
      credits: credits?.balance ?? 0,
      foundingMember: Boolean(subscription?.founding_member),
      marksUsed: billing.questions.used,
      markCap: billing.questions.cap,
      omniUsed: billing.omni.used,
      omniCap: billing.omni.cap,
      periodResetsAt: billing.period_resets_at ?? null,
      enforcementMode: billing.enforcement_mode,
      questionsWarning: billing.questions.warning && shouldShowApproachingLimitBanner(),
      questionsBlocked:
        billing.enforcement_mode === 'enforce' &&
        billing.questions.remaining <= 0 &&
        billing.credit_balance <= 0 &&
        Boolean(billing.questions.reason),
      omniWarning: billing.omni.warning && shouldShowApproachingLimitBanner(),
      omniBlocked:
        billing.enforcement_mode === 'enforce' &&
        billing.omni.remaining <= 0 &&
        billing.credit_balance <= 0 &&
        Boolean(billing.omni.reason),
      recentUsage: (recentUsage ?? []).map((u) => ({
        id: u.id as string,
        eventType: u.event_type as string,
        source: u.source as string,
        creditsDelta: (u.credits_delta as number) ?? 0,
        createdAt: u.created_at as string,
      })),
    },
    notifications: {
      emailExamReminders: Boolean(profile?.email_exam_reminders),
      emailProductUpdates: Boolean(profile?.email_product_updates),
      emailCommunityReplies: profile?.email_community_replies !== false,
      emailCommunityDigest: Boolean(profile?.email_community_digest),
    },
  }
}
