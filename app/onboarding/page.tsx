import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { OnboardingSkeleton } from '@/components/onboarding/OnboardingSkeleton'
import { createOnboardingSaveToken } from '@/lib/onboarding/save-token'
import type { PrimaryGoal, UserStage } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ rerun?: string; next?: string }>

async function OnboardingContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const rerun = params.rerun === '1'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    const next = rerun ? '/onboarding?rerun=1' : '/onboarding'
    redirect(`/auth/signin?next=${encodeURIComponent(next)}`)
  }

  let initialProfile: {
    board: string
    level: string
    subjects: string[]
    stage: UserStage | null
    primary_goal: PrimaryGoal | null
    exam_date: string | null
    target_grade: string | null
  } | null = null

  if (rerun) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('board, level, subjects, stage, primary_goal, exam_date, target_grade')
      .eq('id', user.id)
      .maybeSingle()

    if (profile) {
      initialProfile = {
        board: profile.board ?? 'Cambridge International',
        level: profile.level ?? 'A-Level',
        subjects: profile.subjects ?? [],
        stage: (profile.stage as UserStage | null) ?? null,
        primary_goal: (profile.primary_goal as PrimaryGoal | null) ?? null,
        exam_date: (profile.exam_date as string | null) ?? null,
        target_grade: (profile.target_grade as string | null) ?? null,
      }
    }
  }

  const saveToken = createOnboardingSaveToken(user.id)

  return (
    <OnboardingWizard
      rerun={rerun}
      initialProfile={initialProfile}
      saveToken={saveToken}
    />
  )
}

export default function OnboardingPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingContent searchParams={searchParams} />
    </Suspense>
  )
}
