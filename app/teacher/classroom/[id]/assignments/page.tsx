import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { AssignmentInputError, listAssignments } from '@/lib/teacher/assignments'
import { parseListStatus } from '@/lib/teacher/assignments/list'
import { isTeacherV2 } from '@/lib/teacher/flags'
import type { AssignmentSummary } from '@/lib/teacher/types'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { ClassDeskHead } from '@/components/teacher/ClassDeskHead'
import { ClassTabs } from '@/components/teacher/ClassTabs'
import { AssignmentSlip } from '@/components/teacher/assignments/AssignmentSlip'
import { SetListMore } from '@/components/teacher/assignments/SetListMore'
import { SetStatusTabs } from '@/components/teacher/assignments/SetStatusTabs'
import { composerHref } from '@/components/teacher/assignments/links'
import { firstParam, requestTimeZone, requireClassContext } from './_lib/context'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  if (!isTeacherV2()) return { title: 'Sets' }
  const { classroom } = await requireClassContext(id, `/teacher/classroom/${id}/assignments`)
  return { title: `Sets · ${classroom.name}` }
}

const EMPTY: Record<'open' | 'closed' | 'draft', { title: string; body: string }> = {
  open: {
    title: 'No open sets',
    body: 'Set a past-paper question, a topic drill, a whole paper or your own prompt. Students see it on their dashboard; their marks land here as they hand in.',
  },
  closed: {
    title: 'Nothing closed yet',
    body: 'A set closes when you close it, or a week after its due date. Its marks stay here for good.',
  },
  draft: {
    title: 'No drafts',
    body: 'Save a set as a draft from the composer to finish it later. Students never see a draft.',
  },
}

/**
 * The Sets tab (docs/TEACHER_SYSTEM_SPEC.md §4 `.../assignments`):
 * Open / Closed / Drafts, each set as a `.ms-set-slip` (kind stamp, MOCK
 * chip, due date, hand-in tally), and "Set work". The first page is
 * server-rendered from `?status=`; "Load more" pages on with the route's
 * keyset cursor. A stale `?cursor=` (from an old link) restarts the tab.
 */
export default async function ClassSetsPage({ params, searchParams }: Props) {
  if (!isTeacherV2()) notFound()
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const { supabase, classroom } = await requireClassContext(id, `/teacher/classroom/${id}/assignments`)

  const status = parseListStatus(firstParam(sp.status)) ?? 'open'
  const archived = classroom.archived_at !== null
  // An archived class's retained hand-ins are readable only as the service role.
  const admin = archived ? createServiceClient() : undefined

  let page: { assignments: AssignmentSummary[]; next_cursor: string | null }
  let restarted = false
  try {
    page = await listAssignments(supabase, classroom.id, { status, cursor: firstParam(sp.cursor), admin })
  } catch (err) {
    if (!(err instanceof AssignmentInputError) || err.field !== 'cursor') throw err
    restarted = true
    page = await listAssignments(supabase, classroom.id, { status, admin })
  }
  const timeZone = await requestTimeZone()
  const now = new Date().toISOString()
  const empty = EMPTY[status]

  return (
    <TeacherPageContainer className="ms-teacher-page">
      <ClassDeskHead
        classroom={classroom}
        eyebrow="Sets"
        actions={
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
        }
      />
      <ClassTabs classroomId={classroom.id} current="sets" />

      <section aria-labelledby="sets-title">
        <h2 id="sets-title" className="sr-only">
          {status === 'draft' ? 'Draft sets' : status === 'closed' ? 'Closed sets' : 'Open sets'}
        </h2>
        <div className="mb-5">
          <SetStatusTabs classroomId={classroom.id} status={status} />
        </div>

        {restarted ? (
          <p className="mb-4 text-sm text-[var(--ec-text-secondary)]" role="status">
            That page of the list had moved on, so it starts from the top again.
          </p>
        ) : null}

        {page.assignments.length === 0 ? (
          <div className="ms-teacher-empty">
            <span className="ms-teacher-empty__icon" aria-hidden>
              SET
            </span>
            <h3 className="ms-teacher-empty__title">{empty.title}</h3>
            <p className="ms-teacher-empty__body">{empty.body}</p>
            {!archived && status !== 'closed' ? (
              <div className="ms-teacher-empty__actions">
                <LoadingLink
                  href={composerHref(classroom.id)}
                  loadingText="Opening…"
                  className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center"
                >
                  Set work
                </LoadingLink>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {page.assignments.map((s) => (
                <li key={s.id}>
                  <AssignmentSlip classroomId={classroom.id} summary={s} timeZone={timeZone} now={now} />
                </li>
              ))}
            </ul>
            <SetListMore
              key={`${status}:${page.next_cursor ?? ''}`}
              classroomId={classroom.id}
              status={status}
              cursor={page.next_cursor}
              timeZone={timeZone}
            />
          </>
        )}
      </section>
    </TeacherPageContainer>
  )
}
