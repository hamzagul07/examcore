import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import type { PrimaryGoal, UserStage } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ rerun?: string; next?: string }>

function OnboardingFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-body text-[var(--ec-text-secondary)]">Loading...</p>
    </div>
  )
}

async function OnboardingContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const rerun = params.rerun === '1'

  let initialProfile: {
    subjects: string[]
    stage: UserStage | null
    primary_goal: PrimaryGoal | null
    exam_date: string | null
  } | null = null

  if (rerun) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/auth/signin')

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subjects, stage, primary_goal, exam_date')
      .eq('id', user.id)
      .maybeSingle()

    if (profile) {
      initialProfile = {
        subjects: profile.subjects ?? [],
        stage: (profile.stage as UserStage | null) ?? null,
        primary_goal: (profile.primary_goal as PrimaryGoal | null) ?? null,
        exam_date: (profile.exam_date as string | null) ?? null,
      }
    }
  }

  return (
    <OnboardingWizard
      rerun={rerun}
      initialProfile={initialProfile}
    />
  )
}

export default function OnboardingPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  return (
    <Suspense fallback={<OnboardingFallback />}>
      <OnboardingContent searchParams={searchParams} />
    </Suspense>
  )
}
