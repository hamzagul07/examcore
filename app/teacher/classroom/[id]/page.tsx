import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getSyllabusTree } from '@/lib/syllabi'
import { createServiceClient } from '@/lib/supabase/service'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { teacherOmniContext } from '@/lib/teacher/insights/omni'
import { parseIsoWeek } from '@/lib/teacher/week'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { OmniAIBridge } from '@/components/omni-ai/OmniAIBridge'
import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { ClassDeskHead } from '@/components/teacher/ClassDeskHead'
import { ClassTabs } from '@/components/teacher/ClassTabs'
import { GradeRiskMatrix } from '@/components/teacher/GradeRiskMatrix'
import { InviteCard } from '@/components/teacher/InviteCard'
import { RetryButton } from '@/components/teacher/RetryButton'
import { ErrorGroupsPanel } from '@/components/teacher/assignments/ErrorGroupsPanel'
import { ReteachCard } from '@/components/teacher/assignments/ReteachCard'
import { StudentsToWatch } from '@/components/teacher/assignments/StudentsToWatch'
import { WeekStrip } from '@/components/teacher/assignments/WeekStrip'
import { topicIndex, topicLabel, topicTree } from '@/components/teacher/assignments/composer-model'
import { composerHref } from '@/components/teacher/assignments/links'
import { dueThisWeekNote } from '@/components/teacher/assignments/set-display'
import { firstParam, requestTimeZone, requireClassContext } from './assignments/_lib/context'
import { loadClassWeekView } from './assignments/_lib/class-week-view'
import { loadClassInsights, type ClassInsights } from './assignments/_lib/class-insights'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { classroom } = await requireClassContext(id, `/teacher/classroom/${id}`)
  return { title: classroom.name }
}

type InsightsResult = { ok: true; value: ClassInsights } | { ok: false }

function InsightsSkeleton({ label, height }: { label: string; height: string }) {
  return (
    <div className="mb-8" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading {label}…</span>
      <SkeletonLine className="mb-3 h-5 w-48" />
      <SkeletonBlock className={`${height} w-full`} />
    </div>
  )
}

async function ErrorGroupsSection({
  insights,
  classroomId,
  canSetWork,
}: {
  insights: Promise<InsightsResult>
  classroomId: string
  canSetWork: boolean
}) {
  const result = await insights
  if (!result.ok) {
    return (
      <div className="ms-teacher-error mb-8" role="alert">
        <p className="ms-teacher-error__title">Couldn&apos;t read the class&apos;s marked work</p>
        <p className="ms-teacher-error__body">
          The week above is up to date. Shared mistakes and the grade risk matrix will be back when the page loads
          again.
        </p>
        <div className="mt-4">
          <RetryButton />
        </div>
      </div>
    )
  }
  return (
    <ErrorGroupsPanel
      classroomId={classroomId}
      groups={result.value.groups}
      names={result.value.names}
      canSetWork={canSetWork}
      truncated={result.value.truncated}
      gapsHref={`/teacher/classroom/${encodeURIComponent(classroomId)}/gaps`}
    />
  )
}

async function RiskSection({ insights, classroomId }: { insights: Promise<InsightsResult>; classroomId: string }) {
  const result = await insights
  // The failure is reported once, by the error-groups section above.
  if (!result.ok) return null
  return (
    <div className="mb-8">
      <GradeRiskMatrix students={result.value.quadrants} classroomId={classroomId} truncated={result.value.truncated} />
    </div>
  )
}

/**
 * The class week (docs/TEACHER_SYSTEM_SPEC.md §4 `/teacher/classroom/[id]`):
 * head → tabs → the week's sets → the reteach card → students to watch →
 * shared mistakes → invite → grade risk matrix.
 *
 * A server component. It proves ownership (requireClassContext), then makes
 * one loader call for the week (loadClassWeekView over P1's loadClassWeek).
 * The two panels built from the class's whole marked history — shared
 * mistakes and the risk matrix — share one read that is streamed in behind
 * <Suspense>, so the week never waits for it. `?week=YYYY-Www` shows an
 * earlier week; anything unparseable shows this one.
 *
 * An archived class is read-only: its week shows retained hand-ins only, and
 * the panels that read live work are not shown.
 */
export default async function ClassWeekPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const { supabase, classroom } = await requireClassContext(id, `/teacher/classroom/${id}`)

  const v2 = isTeacherV2()
  const archived = classroom.archived_at !== null
  const canSetWork = v2 && !archived
  // Service client only now that the class is proven to be the caller's.
  const admin = createServiceClient()
  const week = parseIsoWeek(firstParam(sp.week))?.key ?? null

  const [view, timeZone] = await Promise.all([
    loadClassWeekView({ supabase, admin, classroom }, { week }),
    requestTimeZone(),
  ])
  if (!view) notFound()

  const insights: Promise<InsightsResult> | null = archived
    ? null
    : loadClassInsights(supabase, admin, classroom).then(
        (value) => ({ ok: true as const, value }),
        (err: unknown) => {
          console.error('[teacher/class-week] insights failed', {
            classroomId: classroom.id,
            error: err instanceof Error ? err.message : String(err),
          })
          return { ok: false as const }
        }
      )

  const names = topicIndex(topicTree(classroom.subject_code ? getSyllabusTree(classroom.subject_code) : null))
  const reteach = view.reteach
  const unreviewed = view.week.unreviewed
  const invite =
    !archived && classroom.invite_code ? <InviteCard classroom={{ invite_code: classroom.invite_code }} /> : null
  const emptyClass = classroom.studentCount === 0

  return (
    <TeacherPageContainer className="ms-teacher-page">
      <OmniAIBridge context={teacherOmniContext({ classroomId: classroom.id, view: 'week' })} />
      <ClassDeskHead
        classroom={classroom}
        note={v2 && view.isCurrent ? dueThisWeekNote(view.week.assignments, view.range.start, view.range.end) : undefined}
        actions={
          canSetWork ? (
            <LoadingLink
              href={composerHref(classroom.id)}
              loadingText="Opening…"
              className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2"
            >
              <span className="font-mono text-[11px] font-bold" aria-hidden>
                +
              </span>
              Set work
            </LoadingLink>
          ) : undefined
        }
      />
      <ClassTabs
        classroomId={classroom.id}
        current="week"
        v2={v2}
        counts={{
          reviews: { value: unreviewed, label: `${unreviewed} ${unreviewed === 1 ? 'script' : 'scripts'} to review`, alert: true },
        }}
      />

      {/* A class nobody has joined has one job: get the code to the students. */}
      {emptyClass && invite ? <div className="mb-8">{invite}</div> : null}

      {v2 ? (
        <WeekStrip
          classroomId={classroom.id}
          weekKey={view.week.week}
          rangeLabel={view.range.label}
          isCurrent={view.isCurrent}
          prev={view.prev}
          next={view.next}
          sets={view.sets}
          submissionsDelta={view.week.submissions_delta}
          unreviewed={unreviewed}
          timeZone={timeZone}
          now={view.now}
          canSetWork={canSetWork}
        />
      ) : null}

      {v2 && reteach ? (
        <ReteachCard
          classroomId={classroom.id}
          set={reteach.set}
          gap={reteach.gap}
          topics={reteach.codes.map((code) => ({ code, label: topicLabel(code, names) }))}
          handedIn={reteach.handed_in}
          totalStudents={reteach.total_students}
          classMeanPct={reteach.class_mean_pct}
          canSetWork={canSetWork}
        />
      ) : null}

      {!archived ? (
        <StudentsToWatch
          classroomId={classroom.id}
          silent={view.week.silent_students}
          struggling={view.week.struggling}
          improving={view.week.improving}
        />
      ) : null}

      {insights ? (
        <Suspense fallback={<InsightsSkeleton label="shared mistakes" height="h-40" />}>
          <ErrorGroupsSection insights={insights} classroomId={classroom.id} canSetWork={canSetWork} />
        </Suspense>
      ) : null}

      {!emptyClass && invite ? <div className="mb-8">{invite}</div> : null}

      {insights ? (
        <Suspense fallback={<InsightsSkeleton label="the grade risk matrix" height="h-80" />}>
          <RiskSection insights={insights} classroomId={classroom.id} />
        </Suspense>
      ) : null}
    </TeacherPageContainer>
  )
}
