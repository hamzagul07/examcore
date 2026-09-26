import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { LoadingLink } from '@/components/ui/LoadingLink'
import {
  StudentInputError,
  loadStudentAssignments,
  studentRequestTimeZone,
  type StudentAssignmentList,
} from '@/lib/student/assignments'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { SetSlip } from './_components/SetSlip'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your sets',
  robots: { index: false, follow: false },
}

type Props = { searchParams: Promise<{ cursor?: string | string[] }> }

/**
 * `/dashboard/assignments` — everything the student's teachers have set
 * (docs/TEACHER_SYSTEM_SPEC.md §4): "To do" (open, soonest deadline first)
 * and "Done" (handed in, excused or closed; keyset-paged, most recent first,
 * `?cursor=` for older pages). A server component over the student's own RLS
 * reads (lib/student/assignments.ts).
 */
export default async function StudentAssignmentsPage({ searchParams }: Props) {
  if (!isTeacherV2()) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin?next=%2Fdashboard%2Fassignments')

  const sp = await searchParams
  const cursor = typeof sp.cursor === 'string' && sp.cursor ? sp.cursor : null
  const now = new Date()

  let list: StudentAssignmentList | null = null
  let badCursor = false
  try {
    list = await loadStudentAssignments(supabase, user.id, { cursor, now })
  } catch (err) {
    if (!(err instanceof StudentInputError)) throw err
    badCursor = true
  }
  // A stale or hand-edited page link: start from the newest.
  if (badCursor || !list) redirect('/dashboard/assignments')

  const timeZone = await studentRequestTimeZone()
  const nowIso = now.toISOString()
  const firstPage = cursor === null
  const nothingAtAll = firstPage && list.open.length === 0 && list.done.length === 0

  return (
    <main className="app-shell app-shell-tabbed">
      <div className="mx-auto w-full min-w-0 max-w-3xl pb-10">
        <Link
          href="/dashboard"
          className="ec-card ec-card--paper mb-8 inline-flex min-h-[44px] items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-brand)]"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden />
          Back to dashboard
        </Link>

        <header className="mb-8">
          <p className="ms-overline mb-3">Set by your teacher</p>
          <h1 className="text-hero text-[var(--ec-text-primary)]">Your sets</h1>
          <p className="mt-3 max-w-prose leading-relaxed text-[var(--ec-text-secondary)]">
            Work your teachers have set, and what you&apos;ve handed in. Marks you hand in on a set are
            visible to the teacher who set it.
          </p>
        </header>

        {nothingAtAll ? (
          <div className="ms-teacher-empty">
            <span className="ms-teacher-empty__icon" aria-hidden>
              0
            </span>
            <p className="ms-teacher-empty__title">No sets yet</p>
            <p className="ms-teacher-empty__body">
              When a teacher sets work for your class it appears here, with a link to mark each question.
              Got a class code?{' '}
              <Link href="/join" className="font-semibold text-[var(--ec-brand)] underline-offset-2 hover:underline">
                Join a class
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            {firstPage ? (
              <section aria-labelledby="sets-open" className="mb-10">
                <h2 id="sets-open" className="text-h3 mb-4 text-[var(--ec-text-primary)]">
                  To do{' '}
                  <span className="font-mono text-sm font-bold text-[var(--ec-text-secondary)]">
                    {list.open.length}
                  </span>
                </h2>
                {list.open.length === 0 ? (
                  <p className="ec-card ec-card--paper p-4 text-sm text-[var(--ec-text-secondary)]">
                    Nothing to do right now — you&apos;re up to date.
                  </p>
                ) : (
                  <ul className="m-0 list-none space-y-3 p-0">
                    {list.open.map((set) => (
                      <SetSlip key={set.id} set={set} timeZone={timeZone} now={nowIso} />
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            <section aria-labelledby="sets-done">
              <h2 id="sets-done" className="text-h3 mb-4 text-[var(--ec-text-primary)]">
                {firstPage ? 'Done' : 'Older sets'}
              </h2>
              {list.done.length === 0 ? (
                <p className="text-sm text-[var(--ec-text-secondary)]">
                  {firstPage ? 'Sets you finish, or that close, move here.' : 'No older sets.'}
                </p>
              ) : (
                <ul className="m-0 list-none space-y-3 p-0">
                  {list.done.map((set) => (
                    <SetSlip key={set.id} set={set} timeZone={timeZone} now={nowIso} />
                  ))}
                </ul>
              )}
              <nav aria-label="Older and newer sets" className="mt-6 flex flex-wrap items-center gap-3">
                {!firstPage ? (
                  <LoadingLink
                    href="/dashboard/assignments"
                    variant="inline"
                    className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center px-5"
                  >
                    ← Newest sets
                  </LoadingLink>
                ) : null}
                {list.next_cursor ? (
                  <LoadingLink
                    href={`/dashboard/assignments?cursor=${encodeURIComponent(list.next_cursor)}`}
                    variant="inline"
                    className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center px-5"
                  >
                    Older sets →
                  </LoadingLink>
                ) : null}
              </nav>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
