import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase-server'
import { loadPlanEvidence, loadStudyPlan } from '@/lib/plan/study-plan-service'
import {
  IB_SUBJECT_OPTIONS,
  SUBJECTS,
  catalogBoardSubjects,
  defaultSubjectsForProfile,
  getSubjectById,
  isCatalogBoard,
  isIbBoard,
  type SubjectOption,
} from '@/lib/profile-options'
import { StudyPlanScreen } from '@/components/plan/StudyPlanScreen'

export const metadata: Metadata = {
  title: 'Study plan',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

/**
 * /dashboard/plan — the day-by-day plan to the exam.
 *
 * Server side loads the saved plan and the profile defaults; the screen is a
 * client component because the builder is a form and the roadmap ticks days
 * off in place.
 */
export default async function StudyPlanPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin?next=/dashboard/plan')

  const admin = createServiceClient()
  const [{ data: profile }, saved] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('full_name, level, board, subjects, exam_date, email_exam_reminders')
      .eq('id', user.id)
      .maybeSingle(),
    loadStudyPlan(admin, user.id),
  ])

  const evidence = saved ? await loadPlanEvidence(admin, user.id, saved.plan) : []

  const board = (profile?.board as string | null) ?? 'Cambridge International'
  const level = (profile?.level as string | null) ?? 'A-Level'
  const profileSubjects: string[] = profile?.subjects?.length
    ? (profile.subjects as string[])
    : defaultSubjectsForProfile(board, level)

  // The student's own subjects first, then the rest of what their board can
  // mark, so a plan can cover a subject they never added to the profile.
  const own = profileSubjects
    .map((name) => getSubjectById(name, level))
    .filter((s): s is SubjectOption => Boolean(s?.code))
  const pool: SubjectOption[] = isIbBoard(board)
    ? IB_SUBJECT_OPTIONS
    : isCatalogBoard(board)
      ? catalogBoardSubjects(board)
      : SUBJECTS.filter((s) => s.enabled && s.levels.includes(level))
  const seen = new Set<string>()
  const subjectOptions = [...own, ...pool.filter((s) => s.markingEnabled)]
    .filter((s) => (seen.has(s.code) ? false : (seen.add(s.code), true)))
    .map((s) => ({ code: s.code, label: s.label }))

  const firstName = ((profile?.full_name as string | null) ?? '').trim().split(/\s+/)[0] || ''

  return (
    <div className="mx-auto max-w-[var(--ec-content-max,860px)] px-4 py-10 sm:px-6">
      <StudyPlanScreen
        initial={saved}
        evidence={evidence}
        firstName={firstName}
        subjectOptions={subjectOptions}
        defaults={{
          examDate: (profile?.exam_date as string | null) ?? null,
          subjectCodes: own.map((s) => s.code),
          remindMe: profile?.email_exam_reminders === true,
        }}
      />
    </div>
  )
}
