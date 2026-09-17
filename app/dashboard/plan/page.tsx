import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase-server'
import {
  loadRoadmapEvidence,
  loadRoadmapRolled,
  loadStudyPlan,
  measuredBySubject,
  subjectComponentsFor,
} from '@/lib/plan/study-plan-service'
import { timedPaperSlots } from '@/lib/max/paper-practice-links'
import { isIbSubjectCode } from '@/lib/ib/marking-config'
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
import type { RoadmapInitial } from '@/components/plan/RoadmapScreen'
import type { SetupSubjectOption } from '@/lib/plan/wizard-state'

export const metadata: Metadata = {
  title: 'Exam roadmap',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

/**
 * /dashboard/plan — the roadmap, or the wizard that builds one.
 *
 * The server loads the saved plan through the roadmap reader, which also
 * settles any dates since the plan was last opened (the lazy rollover), so
 * the first render already shows today as the engine sees it. A database
 * that predates the v3 migration still answers: the read falls back to the
 * v2 columns and the screen gets an empty task state at revision 1.
 *
 * The wizard is prefilled from the profile — board, level, exam date,
 * subjects, reminder consent — plus what the student's marked work says per
 * subject, and each subject's papers and shortest timed paper from the
 * catalogue, so the finish-line step can offer a component to choose.
 */
export default async function StudyPlanPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin?next=/dashboard/plan')

  const admin = createServiceClient()
  const [{ data: profile }, initial] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('full_name, level, board, subjects, exam_date, email_exam_reminders')
      .eq('id', user.id)
      .maybeSingle(),
    loadInitial(admin, user.id),
  ])

  const evidence = initial ? (await loadRoadmapEvidence(admin, user.id, initial.plan)).keys : []

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
  const subjectOptions: SetupSubjectOption[] = [...own, ...pool.filter((s) => s.markingEnabled)]
    .filter((s) => (seen.has(s.code) ? false : (seen.add(s.code), true)))
    .map((s) => {
      const ib = isIbSubjectCode(s.code)
      const components = subjectComponentsFor(s.code)
      const slots = timedPaperSlots(s.code)
      return {
        code: s.code,
        label: s.label,
        board: ib ? 'IB' : board,
        qualification: ib ? 'IB Diploma' : level,
        ...(components.length > 0 ? { components } : {}),
        ...(slots.length > 0 ? { paperMinutes: Math.min(...slots.map((slot) => slot.minutes)) } : {}),
      }
    })

  const measured = await measuredBySubject(
    admin,
    user.id,
    subjectOptions.map((s) => s.code)
  )

  const firstName = ((profile?.full_name as string | null) ?? '').trim().split(/\s+/)[0] || ''
  // The profile has no zone of its own; a saved plan's zone is the best prior, and the wizard falls back to the browser.
  const timeZone = initial?.plan.timeZone ?? undefined

  return (
    <div className="mx-auto max-w-[var(--ec-content-max,860px)] px-4 py-10 sm:px-6">
      <StudyPlanScreen
        initial={initial}
        evidence={evidence}
        firstName={firstName}
        subjectOptions={subjectOptions}
        profile={{
          board,
          level,
          examDate: (profile?.exam_date as string | null) ?? null,
          subjectCodes: own.map((s) => s.code),
          remindMe: profile?.email_exam_reminders === true,
          ...(timeZone ? { timeZone } : {}),
          ...(firstName ? { firstName } : {}),
          measured,
        }}
      />
    </div>
  )
}

/** The saved plan with its task state and revision; the v2 reader when the v3 columns are not there yet. */
async function loadInitial(admin: ReturnType<typeof createServiceClient>, userId: string): Promise<RoadmapInitial | null> {
  try {
    const rolled = await loadRoadmapRolled(admin, userId)
    if (!rolled) return null
    const { loaded, ctx } = rolled
    return {
      plan: loaded.plan,
      done: loaded.done,
      taskState: loaded.taskState,
      revision: loaded.revision,
      canUndo: loaded.undo !== null,
      // The server's clock in the plan's zone, so the first client render matches the HTML; the screen ticks from there.
      todayIso: ctx.todayIso,
      nowMinute: ctx.nowMinute,
    }
  } catch (err) {
    console.error('[plan] roadmap read failed, falling back to the v2 columns', err)
    const saved = await loadStudyPlan(admin, userId)
    if (!saved) return null
    return { plan: saved.plan, done: saved.done, taskState: saved.taskState ?? {}, revision: saved.revision ?? 1, canUndo: false }
  }
}
