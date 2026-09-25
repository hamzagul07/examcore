import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { usesLetterGradeBands } from '@/lib/target-grade'
import { AUTO_CLOSE_AFTER_DUE_DAYS, assignmentStatus } from '@/lib/teacher/assignment-status'
import { loadAssignmentGaps } from '@/lib/teacher/assignments'
import { owesWork } from '@/lib/teacher/assignments/progress'
import { isTeacherV2 } from '@/lib/teacher/flags'
import type { Assignment, AssignmentItem } from '@/lib/teacher/types'
import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { TeacherBackLink, TeacherDeskHead, TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { AssignmentActions } from '@/components/teacher/assignments/AssignmentActions'
import { CompletionMatrix } from '@/components/teacher/assignments/CompletionMatrix'
import { ItemGapList } from '@/components/teacher/assignments/ItemGapList'
import { LateList } from '@/components/teacher/assignments/LateList'
import { LocalTime } from '@/components/teacher/assignments/LocalTime'
import { MockDistributionPanel } from '@/components/teacher/assignments/MockDistributionPanel'
import { setsHref } from '@/components/teacher/assignments/links'
import { matrixColumns } from '@/components/teacher/assignments/matrix-cells'
import {
  KIND_LABEL,
  KIND_STAMP,
  STATUS_LABEL,
  itemCountLabel,
  sourceLabel,
} from '@/components/teacher/assignments/set-display'
import { requestTimeZone } from '../_lib/context'
import { loadSetPage } from '../_lib/set-context'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string; aid: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, aid } = await params
  if (!isTeacherV2()) return { title: 'Set' }
  const { assignment, classroom } = await loadSetPage(id, aid)
  return { title: `${assignment.title} · ${classroom.name}` }
}

const DAY_MS = 86_400_000

/** Whether clearing closed_at would actually reopen the set (not past its automatic close). */
function reopenable(a: Pick<Assignment, 'closed_at' | 'due_at' | 'archived_at'>, now: number): boolean {
  if (!a.closed_at || a.archived_at) return false
  if (!a.due_at) return true
  return Date.parse(a.due_at) + AUTO_CLOSE_AFTER_DUE_DAYS * DAY_MS > now
}

function DraftItems({ items }: { items: readonly AssignmentItem[] }) {
  const columns = matrixColumns(items)
  const byId = new Map(items.map((i) => [i.id, i]))
  return (
    <section aria-labelledby="draft-items-title" className="ms-teacher-roster">
      <h2 id="draft-items-title" className="ms-class-due__title">
        In this draft
      </h2>
      <p className="ms-class-due__sub mb-4">Students can&apos;t see a draft. Publish it when it is ready.</p>
      {columns.length === 0 ? (
        <p className="ms-students-watch__empty">
          Nothing in it yet. A set needs at least one item to publish — use Edit draft to add some.
        </p>
      ) : (
        <ol className="ms-teacher-roster__list">
          {columns.map((c, i) => {
            const item = byId.get(c.item_id)
            return (
              <li key={c.item_id} className="ms-teacher-roster__row">
                <span className="ms-teacher-roster__who">
                  <span className="ms-teacher-roster__name">
                    {i + 1}. {c.label}
                    {c.sub ? <span className="ms-class-due__code"> · {c.sub}</span> : null}
                  </span>
                  {item?.item_type === 'prompt' && item.prompt_text ? (
                    <span className="ms-teacher-roster__meta line-clamp-2">{item.prompt_text}</span>
                  ) : item?.topic_code ? (
                    <span className="ms-teacher-roster__meta">Picked for topic {item.topic_code}</span>
                  ) : null}
                </span>
                <span className="ms-teacher-roster__trail font-mono text-xs font-bold">
                  {c.total_marks !== null ? `[${c.total_marks}]` : ''}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

function GapsSkeleton() {
  return (
    <div className="mb-8" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading where the marks went…</span>
      <SkeletonLine className="mb-3 h-6 w-52" />
      <SkeletonBlock className="h-40 w-full" />
    </div>
  )
}

async function GapsSection({
  supabase,
  admin,
  classroomId,
  assignmentId,
  items,
}: {
  supabase: SupabaseClient
  admin: SupabaseClient
  classroomId: string
  assignmentId: string
  items: AssignmentItem[]
}) {
  let gaps: Awaited<ReturnType<typeof loadAssignmentGaps>>
  try {
    gaps = await loadAssignmentGaps(supabase, admin, assignmentId)
  } catch (err) {
    console.error('[teacher/set-page] gaps failed', {
      assignmentId,
      error: err instanceof Error ? err.message : String(err),
    })
    return (
      <div className="ms-teacher-error mb-8" role="alert">
        <p className="ms-teacher-error__title">Couldn&apos;t work out where the marks went</p>
        <p className="ms-teacher-error__body">
          The hand-ins above are up to date. Reload the page to try the per-question breakdown again.
        </p>
      </div>
    )
  }
  if (!gaps) return null
  return (
    <ItemGapList
      classroomId={classroomId}
      assignmentId={assignmentId}
      items={items}
      gaps={gaps.per_item}
      headline={gaps.headline}
      archived={gaps.archived}
    />
  )
}

/**
 * One set (docs/TEACHER_SYSTEM_SPEC.md §4 `.../assignments/[aid]`): the head
 * with its actions (Remind / Extend / Close / Print / Export), the
 * completion matrix, the mock grade spread for a mock, where the marks went
 * (streamed — it reads every script's per-mark detail), and the late list
 * with Excuse / Extend. A draft shows what is in it and Publish instead.
 *
 * A server component over loadSetPage (ownership → reconcile → loadAssignment).
 */
export default async function SetPage({ params }: Props) {
  if (!isTeacherV2()) notFound()
  const { id, aid } = await params
  const { supabase, admin, classroom, assignment, items, progress } = await loadSetPage(id, aid)
  const timeZone = await requestTimeZone()

  const now = new Date()
  const nowIso = now.toISOString()
  const status = assignmentStatus(assignment, now)
  const archivedClass = classroom.archived_at !== null
  const active = progress.students.filter((s) => s.membership === 'active')
  const owing = progress.students.filter(owesWork).length
  const overdue = status === 'open' && assignment.due_at !== null && Date.parse(assignment.due_at) < now.getTime()
  const source = sourceLabel(assignment.source)
  const timed = assignment.settings.timed_minutes
  const letterGrades = !(classroom.subject_code ?? '').startsWith('ib-') && usesLetterGradeBands(classroom.board ?? '')

  const note =
    status === 'draft'
      ? 'not sent yet'
      : status === 'closed'
        ? 'closed'
        : overdue && owing > 0
          ? `${owing} still to hand in`
          : `${progress.handed_in} of ${progress.total_students} in`

  const lead = (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span
        className={`ms-teacher-chip${status === 'draft' ? ' ms-teacher-chip--draft' : status === 'closed' ? ' ms-teacher-chip--archived' : ''}`}
      >
        {STATUS_LABEL[status]}
      </span>
      {assignment.is_mock ? <span className="ms-teacher-chip ms-teacher-chip--mock">Mock</span> : null}
      <span>{KIND_LABEL[assignment.kind]}</span>
      <span aria-hidden>·</span>
      <span>{itemCountLabel(assignment.kind, items.length)}</span>
      <span aria-hidden>·</span>
      <span className={overdue ? 'text-[var(--ec-ink-crimson)]' : undefined}>
        {assignment.due_at ? (
          <>
            Due <LocalTime iso={assignment.due_at} variant="long" timeZone={timeZone} />
          </>
        ) : (
          'No due date'
        )}
      </span>
      {typeof timed === 'number' ? (
        <>
          <span aria-hidden>·</span>
          <span>Timed, {timed} min</span>
        </>
      ) : null}
      <span aria-hidden>·</span>
      <span>
        {assignment.target === 'all'
          ? 'Whole class'
          : `${active.length} picked ${active.length === 1 ? 'student' : 'students'}`}
      </span>
      {source ? (
        <>
          <span aria-hidden>·</span>
          <span>{source}</span>
        </>
      ) : null}
    </span>
  )

  return (
    <TeacherPageContainer className="ms-teacher-page">
      <TeacherBackLink href={setsHref(classroom.id, status === 'open' ? undefined : status)}>
        &lt;- Sets · {classroom.name}
      </TeacherBackLink>
      <TeacherDeskHead eyebrow="Set" stamp={KIND_STAMP[assignment.kind]} title={assignment.title} lead={lead} note={note} />

      {archivedClass ? (
        <p className="ms-teacher-archived-banner" role="status">
          <span className="ms-teacher-chip ms-teacher-chip--archived">Archived class</span>
          Read-only: these are the marks kept from when the class was active.
        </p>
      ) : null}

      <AssignmentActions
        classroomId={classroom.id}
        assignment={{
          id: assignment.id,
          title: assignment.title,
          status,
          due_at: assignment.due_at,
          allow_late: assignment.settings.allow_late !== false,
        }}
        owing={owing}
        canReopen={status === 'closed' && reopenable(assignment, now.getTime())}
        readOnly={archivedClass}
      />

      {assignment.instructions ? (
        <section aria-labelledby="set-instructions" className="mb-8">
          <h2 id="set-instructions" className="ms-teacher-section-title">
            Instructions
          </h2>
          <p className="m-0 max-w-3xl whitespace-pre-line text-[var(--ec-text-primary)]">{assignment.instructions}</p>
        </section>
      ) : null}

      {status === 'draft' ? (
        <DraftItems items={items} />
      ) : (
        <>
          <CompletionMatrix classroomId={classroom.id} title={assignment.title} items={items} progress={progress} />

          {assignment.is_mock ? (
            <div className="mb-8">
              <MockDistributionPanel students={progress.students} letterGrades={letterGrades} />
            </div>
          ) : null}

          <Suspense fallback={<GapsSkeleton />}>
            <GapsSection
              supabase={supabase}
              admin={admin}
              classroomId={classroom.id}
              assignmentId={assignment.id}
              items={items}
            />
          </Suspense>

          <LateList
            classroomId={classroom.id}
            assignment={{ id: assignment.id, title: assignment.title, due_at: assignment.due_at }}
            students={progress.students}
            now={nowIso}
            timeZone={timeZone}
            readOnly={archivedClass}
          />
        </>
      )}
    </TeacherPageContainer>
  )
}
