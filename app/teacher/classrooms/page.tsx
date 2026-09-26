import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { loadTeacherOverview } from '@/lib/teacher/overview'
import { decodeClassroomCursor, listTeacherClassrooms, type TeacherClassroomRow } from '@/lib/teacher/list-classrooms'
import type { TeacherOverview } from '@/lib/teacher/types'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { Disclosure } from '@/components/ui/Disclosure'
import { TeacherDeskHead, TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { ClassSlipList, type DeskClass } from '@/components/teacher/ClassSlipList'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Classes' }

const EMPTY_TALLY = {
  open_assignments: 0,
  due_this_week: 0,
  unreviewed: 0,
  late_students: 0,
  headline_gap: null,
}

/** A listed classroom with its desk tallies (zeros when the overview could not be read). */
function toDeskClass(row: TeacherClassroomRow, tallies: Map<string, TeacherOverview['classes'][number]>): DeskClass {
  const t = tallies.get(row.id)
  return {
    id: row.id,
    name: row.name,
    subject_code: row.subject_code,
    members: row.studentCount,
    archived: row.archived_at !== null,
    ...(t
      ? {
          open_assignments: t.open_assignments,
          due_this_week: t.due_this_week,
          unreviewed: t.unreviewed,
          late_students: t.late_students,
          headline_gap: t.headline_gap,
        }
      : EMPTY_TALLY),
    invite_code: row.invite_code,
    year_group: row.year_group,
    demo: !!row.settings.demo,
  }
}

/**
 * Every class the teacher has — the same slips as the desk, full page, with
 * invite codes on their faces, newest first and keyset-paginated (`?cursor`).
 * Archived classes are folded away at the bottom.
 */
export default async function TeacherClassroomsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin?next=/teacher/classrooms')

  const raw = (await searchParams).cursor
  // A cursor that does not decode is treated as "first page", not an error.
  const cursor = raw && decodeClassroomCursor(raw) ? raw : undefined
  const [active, archived, overview] = await Promise.all([
    listTeacherClassrooms(supabase, user.id, { scope: 'active', cursor: cursor ?? null }),
    cursor ? null : listTeacherClassrooms(supabase, user.id, { scope: 'archived', limit: 100 }),
    loadTeacherOverview(supabase, user.id).catch((err: unknown) => {
      // The list is still useful without tallies.
      console.error('[teacher/classes] overview failed:', err instanceof Error ? err.message : err)
      return null
    }),
  ])

  if (!active.ok && active.status === 403) redirect('/dashboard')

  const tallies = new Map((overview?.classes ?? []).map((c) => [c.id, c]))
  const newClass = (
    <LoadingLink
      href="/teacher/classrooms/new"
      loadingText="Opening…"
      className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2"
    >
      <span className="font-mono text-[11px] font-bold" aria-hidden>
        +
      </span>
      New class
    </LoadingLink>
  )

  return (
    <TeacherPageContainer className="ms-teacher-page">
      <TeacherDeskHead
        eyebrow="Classes"
        stamp="CL"
        title={cursor ? 'Older classes' : 'Your classes'}
        lead="Open a class for its week, its sets and its students. The code on each slip is the one students type at /join."
        actions={newClass}
      />

      {!active.ok ? (
        <div className="ms-teacher-error" role="alert">
          <p className="ms-teacher-error__title">Couldn&apos;t load your classes</p>
          <p className="ms-teacher-error__body">Something went wrong reading them. Reload the page to try again.</p>
        </div>
      ) : active.classrooms.length === 0 && !cursor ? (
        <div className="ms-teacher-empty">
          <span className="ms-teacher-empty__icon" aria-hidden>
            CL
          </span>
          <h2 className="ms-teacher-empty__title">No live classes</h2>
          <p className="ms-teacher-empty__body">
            Create one and you&apos;ll get a code to read out to the room.
          </p>
          <div className="ms-teacher-empty__actions">{newClass}</div>
        </div>
      ) : (
        <section aria-label="Live classes">
          <ClassSlipList classes={active.classrooms.map((c) => toDeskClass(c, tallies))} />
          {active.next_cursor ? (
            <p className="mt-6">
              <LoadingLink
                href={`/teacher/classrooms?cursor=${encodeURIComponent(active.next_cursor)}`}
                loadingText="Loading…"
                className="ec-btn-secondary inline-flex min-h-[44px] items-center"
              >
                Older classes →
              </LoadingLink>
            </p>
          ) : null}
          {cursor ? (
            <p className="mt-4">
              <LoadingLink href="/teacher/classrooms" variant="inline" className="ec-link inline-flex min-h-[44px] items-center">
                ← Back to the newest
              </LoadingLink>
            </p>
          ) : null}
        </section>
      )}

      {archived?.ok && archived.classrooms.length > 0 ? (
        <Disclosure
          className="ms-teacher-archive"
          summaryClassName="ms-teacher-archive__summary"
          summary={`Archived (${archived.classrooms.length}${archived.next_cursor ? '+' : ''})`}
        >
          <ClassSlipList classes={archived.classrooms.map((c) => toDeskClass(c, tallies))} />
        </Disclosure>
      ) : null}
    </TeacherPageContainer>
  )
}
