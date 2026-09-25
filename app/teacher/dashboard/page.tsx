import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireTeacher } from '@/lib/teacher-auth'
import { capForTier, teacherMarkCap } from '@/lib/billing/caps'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { loadTeacherOverview } from '@/lib/teacher/overview'
import { demoSeedingEnabled, listTeacherClassrooms } from '@/lib/teacher/list-classrooms'
import { loadSeatState, seatCardState } from '@/lib/teacher/seat-grant'
import type { TeacherOverview } from '@/lib/teacher/types'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { Disclosure } from '@/components/ui/Disclosure'
import { TeacherDeskHead, TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { NeedsYouStrip } from '@/components/teacher/NeedsYouStrip'
import { ClassSlipList, type DeskClass } from '@/components/teacher/ClassSlipList'
import { TeacherSeatRequestCard } from '@/components/teacher/TeacherSeatRequestCard'
import { DemoClassButton, TeacherDashboardClient } from '@/components/teacher/TeacherDashboardClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Your desk' }

/** Where a Needs-you tile should go: the one class with the work, or the class list. */
function tileHref(classes: TeacherOverview['classes'], pick: (c: TeacherOverview['classes'][number]) => boolean) {
  const hits = classes.filter((c) => !c.archived && pick(c))
  return hits.length === 1 ? `/teacher/classroom/${hits[0].id}` : '/teacher/classrooms'
}

function NewClassLink({ label = 'New class' }: { label?: string }) {
  return (
    <LoadingLink
      href="/teacher/classrooms/new"
      loadingText="Opening…"
      className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2"
    >
      <span className="font-mono text-[11px] font-bold" aria-hidden>
        +
      </span>
      {label}
    </LoadingLink>
  )
}

/**
 * The teacher desk (spec §4): what needs the teacher today, then every class
 * as a slip, archived classes folded away, and the seat card when the teacher
 * has no verified seat. A server component that loads TeacherOverview once
 * (lib/teacher/overview.ts); the only islands are the demo button and the
 * seat form.
 */
export default async function TeacherDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin?next=/teacher/dashboard')

  const teacherCheck = await requireTeacher(supabase, user.id)
  if (!teacherCheck.ok) redirect('/dashboard')

  const v2 = isTeacherV2()
  const [overviewResult, seat] = await Promise.all([
    loadTeacherOverview(supabase, user.id).then(
      (o) => ({ ok: true as const, overview: o }),
      (err: unknown) => {
        console.error('[teacher/desk] overview failed:', err instanceof Error ? err.message : err)
        return { ok: false as const }
      }
    ),
    // Seat state is service-role only: teacher_verified_at is not selectable
    // by its owner, and seat requests are not readable by their subject.
    loadSeatState(createServiceClient(), user.id).catch((err: unknown) => {
      console.error('[teacher/desk] seat state failed:', err instanceof Error ? err.message : err)
      return { verifiedAt: null, latest: null }
    }),
  ])

  const seatState = seatCardState(seat)
  const seatCard =
    seatState.kind === 'hidden' ? null : (
      <TeacherSeatRequestCard state={seatState} teacherCap={teacherMarkCap()} freeCap={capForTier('free')} />
    )

  if (!overviewResult.ok) {
    return (
      <TeacherPageContainer>
        <TeacherDeskHead eyebrow="Teacher desk" stamp="DK" title="Your desk" actions={<NewClassLink />} />
        {seatCard}
        <div className="ms-teacher-error" role="alert">
          <p className="ms-teacher-error__title">Couldn&apos;t load your classes</p>
          <p className="ms-teacher-error__body">
            Your classes and students are safe — this page just failed to read them. Reload to try
            again; if it keeps happening, your class pages are still reachable from Classes.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <LoadingLink
              href="/teacher/dashboard"
              loadingText="Reloading…"
              className="ec-btn-primary inline-flex min-h-[44px] items-center"
            >
              Try again
            </LoadingLink>
            <LoadingLink
              href="/teacher/classrooms"
              loadingText="Opening…"
              className="ec-btn-ghost inline-flex min-h-[44px] items-center"
            >
              Go to Classes
            </LoadingLink>
          </div>
        </div>
      </TeacherPageContainer>
    )
  }

  const { overview } = overviewResult

  // Invite codes, year groups and the example flag are not part of the
  // overview; one cheap read of the teacher's own rows adds them.
  const details = await listTeacherClassrooms(supabase, user.id, { scope: 'all', limit: 100 })
  const byId = new Map(details.ok ? details.classrooms.map((c) => [c.id, c]) : [])
  const classes: DeskClass[] = overview.classes.map((c) => {
    const d = byId.get(c.id)
    return { ...c, invite_code: d?.invite_code ?? null, year_group: d?.year_group ?? null, demo: !!d?.settings.demo }
  })
  const live = classes.filter((c) => !c.archived)
  const archived = classes.filter((c) => c.archived)
  const dueThisWeek = live.reduce((n, c) => n + c.due_this_week, 0)

  const note =
    live.length === 0
      ? undefined
      : dueThisWeek > 0
        ? `${dueThisWeek} ${dueThisWeek === 1 ? 'set' : 'sets'} due this week`
        : 'nothing due this week'

  return (
    <TeacherPageContainer className="ms-teacher-page">
      <TeacherDashboardClient />
      <TeacherDeskHead
        eyebrow="Teacher desk"
        stamp="DK"
        title="Your desk"
        note={note}
        actions={classes.length > 0 ? <NewClassLink /> : undefined}
      />

      {/* Before the classes: a teacher on the free allowance hits the wall on
          their sixth script, and that matters more than the list. */}
      {seatCard}

      {classes.length === 0 ? (
        <div className="ms-teacher-empty">
          <span className="ms-teacher-empty__icon" aria-hidden>
            CL
          </span>
          <h2 className="ms-teacher-empty__title">Make your first class</h2>
          <p className="ms-teacher-empty__body">
            You&apos;ll get a six-letter code to read out. Once students have joined, set them work
            from past papers or your own prompt — their marks land here as they hand in, with what
            the class as a whole keeps dropping marks on.
          </p>
          <div className="ms-teacher-empty__actions">
            <NewClassLink label="Create a class" />
            {demoSeedingEnabled() ? <DemoClassButton /> : null}
          </div>
        </div>
      ) : (
        <>
          {v2 && live.length > 0 ? (
            <NeedsYouStrip
              needsYou={overview.needs_you}
              hrefs={{
                unreviewed: '/teacher/reviews?status=pending',
                late: tileHref(overview.classes, (c) => c.late_students > 0),
                silent: '/teacher/classrooms',
              }}
            />
          ) : null}

          {live.length > 0 ? (
            <section aria-labelledby="desk-classes">
              <h2 id="desk-classes" className="ms-teacher-section-title">
                Your classes
              </h2>
              <ClassSlipList classes={live} headingLevel="h3" />
            </section>
          ) : (
            <div className="ms-teacher-empty">
              <span className="ms-teacher-empty__icon" aria-hidden>
                CL
              </span>
              <h2 className="ms-teacher-empty__title">Every class is archived</h2>
              <p className="ms-teacher-empty__body">
                Restore one from its settings, or start a new class for this year.
              </p>
              <div className="ms-teacher-empty__actions">
                <NewClassLink label="Create a class" />
              </div>
            </div>
          )}

          {archived.length > 0 ? (
            <Disclosure
              className="ms-teacher-archive"
              summaryClassName="ms-teacher-archive__summary"
              summary={`Archived (${archived.length})`}
            >
              <ClassSlipList classes={archived} headingLevel="h3" />
            </Disclosure>
          ) : null}
        </>
      )}
    </TeacherPageContainer>
  )
}
