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
    .select('full_name, board, level, subjects, onboarded, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  // Middleware ordinarily redirects unfinished onboarders to /onboarding before
  // they ever reach here, but in case middleware is bypassed (e.g. caching),
  // do the same here for defensive routing.
  if (profile && !isOnboardingComplete(profile)) {
    redirect('/onboarding')
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 md:py-14">
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
          <h1 className="text-[44px] font-extrabold leading-[1] tracking-[-0.035em] sm:text-[56px] md:text-[64px]">
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
          }}
        />
      </div>
    </main>
  )
}
