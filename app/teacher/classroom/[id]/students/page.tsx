import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { hydrateSets, loadPublishedSets } from '@/lib/teacher-classroom-data'
import type { ClassroomMember } from '@/lib/teacher-analytics'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { teacherOmniContext } from '@/lib/teacher/insights/omni'
import { rosterIncompleteNote } from '@/lib/teacher/insights/format'
import { latestSetByStudent, pickLatestSet, type RosterSetCell } from '@/lib/teacher/insights/student-record'
import { loadClassRoster } from '@/lib/teacher/list-classrooms'
import { OmniAIBridge } from '@/components/omni-ai/OmniAIBridge'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { ClassDeskHead } from '@/components/teacher/ClassDeskHead'
import { ClassTabs } from '@/components/teacher/ClassTabs'
import { InviteCard } from '@/components/teacher/InviteCard'
import { RetryButton } from '@/components/teacher/RetryButton'
import { StudentCard } from '@/components/teacher/StudentCard'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { setHref } from '@/components/teacher/assignments/links'
import { requireClassContext } from '../assignments/_lib/context'
import { RemoveStudentButton } from './_components/RemoveStudentButton'
import { RosterAnnouncer } from './_components/RosterAnnouncer'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

function pagePath(id: string): string {
  return `/teacher/classroom/${encodeURIComponent(id)}/students`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { classroom } = await requireClassContext(id, pagePath(id))
  return { title: `Students · ${classroom.name}` }
}

type LatestSet = { id: string; title: string; cells: Map<string, RosterSetCell> }

/**
 * The class roster (docs/TEACHER_SYSTEM_SPEC.md §4 `.../students`): one row
 * per member — name, when they joined and last marked work, their state on
 * the class's latest set, overdue sets and topics due — with a LEFT / REMOVED
 * chip for anyone no longer in the class, and Remove (desk-management's
 * DELETE route, behind a confirm dialog) on each active row.
 *
 * A server component. Names come only from the teacher_roster_profiles RPC
 * (loadClassRoster); badges are computed for active members only, over the
 * class's scoped work. The latest-set column is best-effort: if it cannot be
 * read the roster still renders, and says so.
 */
export default async function ClassStudentsPage({ params }: Props) {
  const { id } = await params
  const { supabase, classroom } = await requireClassContext(id, pagePath(id))

  const v2 = isTeacherV2()
  const archived = classroom.archived_at !== null
  // Service client only now that the class is proven to be the caller's.
  const admin = createServiceClient()
  const now = new Date()
  // An archived class's retained hand-ins are only readable as the service role.
  const setsDb = archived ? admin : supabase

  const [roster, latestSet] = await Promise.all([
    loadClassRoster(supabase, admin, classroom, now),
    v2
      ? loadPublishedSets(setsDb, [classroom.id])
          .then(async (sets) => {
            const latest = pickLatestSet(sets)
            if (!latest) return null
            const [hydrated] = await hydrateSets(setsDb, [latest])
            return hydrated ?? null
          })
          .then(
            (set) => ({ ok: true as const, set }),
            (err: unknown) => {
              console.error('[teacher/roster] latest set failed', {
                classroomId: classroom.id,
                error: err instanceof Error ? err.message : String(err),
              })
              return { ok: false as const }
            }
          )
      : Promise.resolve({ ok: true as const, set: null }),
  ])

  const students = roster.ok ? roster.students : []
  const incomplete = roster.ok ? roster.incomplete : null
  const incompleteNote = incomplete ? rosterIncompleteNote(incomplete) : null
  const members: ClassroomMember[] = students.map((s) => ({
    student_id: s.id,
    status: s.status,
    joined_at: s.joined_at,
  }))
  const latest: LatestSet | null =
    latestSet.ok && latestSet.set
      ? { id: latestSet.set.id, title: latestSet.set.title, cells: latestSetByStudent(latestSet.set, members, now) }
      : null

  const activeCount = students.filter((s) => s.status === 'active').length
  const formerCount = students.length - activeCount
  const nowMs = now.getTime()
  const invite =
    !archived && classroom.invite_code ? <InviteCard classroom={{ invite_code: classroom.invite_code }} /> : null

  return (
    <TeacherPageContainer className="ms-teacher-page">
      <OmniAIBridge context={teacherOmniContext({ classroomId: classroom.id, view: 'students' })} />
      <ClassDeskHead classroom={classroom} eyebrow="Students" />
      <ClassTabs classroomId={classroom.id} current="students" v2={v2} />

      {!roster.ok ? (
        <div className="ms-teacher-error mb-8" role="alert">
          <p className="ms-teacher-error__title">The class list didn&apos;t load</p>
          <p className="ms-teacher-error__body">{roster.error} Nothing has changed in the class.</p>
          <div className="mt-4">
            <RetryButton />
          </div>
        </div>
      ) : students.length === 0 ? (
        <>
          <section className="ms-teacher-empty mb-8" aria-labelledby="roster-empty-title">
            <span className="ms-teacher-empty__icon" aria-hidden>
              #
            </span>
            <h2 id="roster-empty-title" className="ms-teacher-empty__title">
              No students yet
            </h2>
            <p className="ms-teacher-empty__body">
              {archived
                ? 'Nobody joined this class while it was active.'
                : 'Share the class code — students appear here the moment they join, and you see work they mark in this subject from then on.'}
            </p>
          </section>
          {invite ? <div className="mb-8">{invite}</div> : null}
        </>
      ) : (
        <RosterAnnouncer headingId="roster-title">
          <section className="ms-teacher-roster" aria-labelledby="roster-title">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="roster-title" className="ms-teacher-section-title" tabIndex={-1}>
                {activeCount} {activeCount === 1 ? 'student' : 'students'}
                {formerCount > 0 ? ` · ${formerCount} no longer in the class` : ''}
              </h2>
              {latest ? (
                <p className="m-0 text-sm text-[var(--ec-text-secondary)]">
                  Latest set:{' '}
                  <LoadingLink href={setHref(classroom.id, latest.id)} variant="inline" className="ec-link">
                    {latest.title}
                  </LoadingLink>
                </p>
              ) : latestSet.ok ? null : (
                <p className="m-0 text-sm text-[var(--ec-text-secondary)]" role="status">
                  The latest set&apos;s hand-ins didn&apos;t load — reload to see them.
                </p>
              )}
            </div>
            {incompleteNote ? (
              <p className="mb-4 mt-0 text-sm text-[var(--ec-text-secondary)]" role="status">
                {incompleteNote}
              </p>
            ) : null}
            <ul className="ms-teacher-roster__list">
              {students.map((s) => {
                const cell = latest?.cells.get(s.id)
                return (
                  <StudentCard
                    key={s.id}
                    classroomId={classroom.id}
                    student={s}
                    latest={latest && cell ? { title: latest.title, cell } : null}
                    nowMs={nowMs}
                    lastActiveUnknown={incomplete?.last_active ?? false}
                    actions={
                      s.status === 'active' && !archived ? (
                        <RemoveStudentButton
                          classroomId={classroom.id}
                          studentId={s.id}
                          name={s.full_name?.trim() || 'this student'}
                        />
                      ) : undefined
                    }
                  />
                )
              })}
            </ul>
          </section>
        </RosterAnnouncer>
      )}
    </TeacherPageContainer>
  )
}
