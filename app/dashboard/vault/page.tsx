import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import type { AttemptWithPaper } from '@/lib/syllabi/attempts'
import {
  defaultMarkSubjectCode,
  defaultSubjectsForProfile,
  getSubjectById,
} from '@/lib/profile-options'
import { hasSyllabusTree } from '@/lib/syllabi'
import { effectiveAccess } from '@/lib/billing/access'
import { hasMaxResourceVault } from '@/lib/billing/features'
import { loadMaxVaultData, type VaultSubjectInput } from '@/lib/max/vault-data'
import { maybeGrantMaxSprintGift } from '@/lib/max/gifts'
import { MaxVaultTeaser } from '@/components/max/MaxVaultTeaser'
import { MaxVaultView } from '@/components/max/MaxVaultView'
import { AppSupportStrip } from '@/components/marketing/AppSupportStrip'
import type { SubscriptionStatus, SubscriptionTier } from '@/lib/database.types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const metadata = {
  title: 'Max Resource Vault · MarkScheme',
  robots: { index: false, follow: false },
}

export default async function MaxVaultPage({
  searchParams,
}: {
  searchParams?: Promise<{ subject?: string }>
}) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin?next=/dashboard/vault')

  const params = searchParams ? await searchParams : {}
  const subjectOverride = params.subject?.trim() || null

  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('full_name, level, subjects, exam_date, board, target_grade')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('user_subscriptions')
      .select('tier, status')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const access = effectiveAccess({
    tier: (sub?.tier as SubscriptionTier) ?? 'free',
    status: (sub?.status as SubscriptionStatus) ?? 'canceled',
  })

  if (!hasMaxResourceVault(access)) {
    return (
      <main className="app-shell app-shell-tabbed">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <MaxVaultTeaser />
        </div>
        <AppSupportStrip />
      </main>
    )
  }

  const examDate = (profile?.exam_date as string | null) ?? null
  const sprint = await maybeGrantMaxSprintGift(supabaseAdmin, user.id, examDate)

  const profileLevel = profile?.level ?? 'A-Level'
  const profileBoard = profile?.board ?? 'Cambridge International'
  const profileSubjects: string[] = profile?.subjects?.length
    ? profile.subjects
    : defaultSubjectsForProfile(profileBoard, profileLevel)

  const subjects: VaultSubjectInput[] = []
  const seen = new Set<string>()
  for (const name of profileSubjects) {
    const s = getSubjectById(name, profileLevel)
    const code = s?.code
    if (!code || seen.has(code)) continue
    seen.add(code)
    subjects.push({ code, name: s?.label ?? name })
  }
  // Ensure at least one subject so the vault isn't empty for brand-new Max users.
  if (subjects.length === 0) {
    const fallback = defaultMarkSubjectCode(profileLevel)
    if (fallback) {
      subjects.push({
        code: fallback,
        name: getSubjectById(
          profileSubjects[0] ?? '',
          profileLevel
        )?.label ?? fallback,
      })
    }
  }
  // Prefer marking-enabled / treed subjects first in the list for focus picking.
  subjects.sort((a, b) => {
    const at = hasSyllabusTree(a.code) ? 0 : 1
    const bt = hasSyllabusTree(b.code) ? 0 : 1
    return at - bt
  })

  const { data: attempts } = await supabaseAdmin
    .from('attempts')
    .select(
      'id, marks_earned, total_marks, syllabus_tags, created_at, mark_schemes ( paper_code )'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  const vault = await loadMaxVaultData({
    supabase: supabaseAdmin,
    userId: user.id,
    subjects,
    focusCode: subjectOverride,
    examDate,
    targetGrade: (profile?.target_grade as string | null) ?? null,
    attempts: (attempts || []) as AttemptWithPaper[],
  })

  return (
    <main className="app-shell app-shell-tabbed ms-dash-home">
      <div className="mx-auto min-w-0 max-w-7xl rounded-none px-0 pb-8 pt-0 sm:rounded">
        <MaxVaultView data={vault} sprintCreditsGranted={sprint.grantedCredits} />
      </div>
      <AppSupportStrip />
    </main>
  )
}
