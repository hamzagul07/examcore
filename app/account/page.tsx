import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { AccountClient } from './account-client'
import {
  DEFAULT_BOARD,
  DEFAULT_LEVEL,
  DEFAULT_SUBJECTS,
} from '@/lib/profile-options'
import { isOnboardingComplete } from '@/lib/onboarding'
import { computeBillingSummary } from '@/lib/billing/enforcement'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, board, level, subjects, onboarded, onboarding_completed, exam_date')
    .eq('id', user.id)
    .maybeSingle()

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

  // Middleware ordinarily redirects unfinished onboarders to /onboarding before
  // they ever reach here, but in case middleware is bypassed (e.g. caching),
  // do the same here for defensive routing.
  if (profile && !isOnboardingComplete(profile)) {
    redirect('/onboarding')
  }

  return (
    <main className="app-shell app-shell-tabbed md:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <div className="animate-entry mb-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-dark-900/60 px-3 py-1.5 text-xs font-semibold text-slate-400 backdrop-blur transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to dashboard
          </Link>
          <p className="ec-label-tech mt-5 mb-3">SETTINGS</p>
          <h1 className="text-hero">
            <span className="gradient-text">Account</span>{' '}
            <span className="ec-text-gradient">settings</span>
          </h1>
          <p className="mt-3 text-base text-slate-400 sm:text-lg">
            Update your profile and security preferences.
          </p>
        </div>

        <AccountClient
          email={user.email ?? ''}
          initialProfile={{
            full_name: profile?.full_name ?? '',
            board: profile?.board ?? DEFAULT_BOARD,
            level: profile?.level ?? DEFAULT_LEVEL,
            subjects: profile?.subjects ?? DEFAULT_SUBJECTS,
            exam_date: (profile?.exam_date as string | null) ?? '',
          }}
          billing={{
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
            recentUsage: (recentUsage ?? []).map((u) => ({
              id: u.id as string,
              eventType: u.event_type as string,
              source: u.source as string,
              creditsDelta: (u.credits_delta as number) ?? 0,
              createdAt: u.created_at as string,
            })),
          }}
        />
      </div>
    </main>
  )
}
