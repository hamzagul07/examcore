import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireTeacher } from '@/lib/teacher-auth'
import {
  DEFAULT_REVIEW_PAGE,
  REVIEW_STATUS_LABEL,
  decodeReviewCursor,
  hasReviewFilters,
  loadReviewQueue,
  pageReviewItems,
  parseReviewFilters,
  reviewFilterQuery,
  reviewsInboxHref,
  type ReviewCounts,
  type ReviewFilters as Filters,
  type ReviewQueueLoad,
} from '@/lib/teacher/reviews-query'
import { teacherOmniContext } from '@/lib/teacher/insights/omni'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { loadTeacherClassroom, type TeacherClassroomRow } from '@/lib/teacher/list-classrooms'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { OmniAIBridge } from '@/components/omni-ai/OmniAIBridge'
import { ClassDeskHead } from '@/components/teacher/ClassDeskHead'
import { ClassTabs } from '@/components/teacher/ClassTabs'
import { TeacherDeskHead, TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { ReviewFilters } from '@/components/teacher/ReviewFilters'
import { ReviewQueueList } from '@/components/teacher/ReviewQueueList'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Reviews' }

type SearchParams = Record<string, string | string[] | undefined>

function countLine(counts: ReviewCounts): string {
  const parts = [
    `${counts.pending} ${REVIEW_STATUS_LABEL.pending.toLowerCase()}`,
    `${counts.flagged} ${REVIEW_STATUS_LABEL.flagged.toLowerCase()}`,
    `${counts.confirmed} ${REVIEW_STATUS_LABEL.confirmed.toLowerCase()}`,
    `${counts.overridden} ${REVIEW_STATUS_LABEL.overridden.toLowerCase()}`,
  ]
  return parts.join(' · ')
}

/** The empty state that fits why the list is empty. */
function EmptyQueue({ queue, filters }: { queue: Extract<ReviewQueueLoad, { ok: true }>; filters: Filters }) {
  if (queue.liveClassCount === 0) {
    return (
      <div className="ms-teacher-empty">
        <span className="ms-teacher-empty__icon" aria-hidden>
          RV
        </span>
        <h2 className="ms-teacher-empty__title">No classes yet</h2>
        <p className="ms-teacher-empty__body">
          Scripts land here once students in one of your classes mark work in its subject. Create a class to get a
          code to share with them.
        </p>
        <div className="ms-teacher-empty__actions">
          <LoadingLink
            href="/teacher/classrooms/new"
            loadingText="Opening…"
            className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center"
          >
            Create a class
          </LoadingLink>
        </div>
      </div>
    )
  }
  if (queue.counts.total > 0 && filters.status) {
    const label = REVIEW_STATUS_LABEL[filters.status].toLowerCase()
    return (
      <div className="ms-teacher-empty">
        <span className="ms-teacher-empty__icon" aria-hidden>
          OK
        </span>
        <h2 className="ms-teacher-empty__title">Nothing {label}</h2>
        <p className="ms-teacher-empty__body">
          {filters.status === 'pending'
            ? 'Every script here has your decision. New work shows up as students mark it.'
            : `No script in this view is ${label}. Pick another status to see the rest.`}
        </p>
      </div>
    )
  }
  if (hasReviewFilters(filters)) {
    return (
      <div className="ms-teacher-empty">
        <span className="ms-teacher-empty__icon" aria-hidden>
          RV
        </span>
        <h2 className="ms-teacher-empty__title">No scripts match these filters</h2>
        <p className="ms-teacher-empty__body">
          Nothing marked in the last {queue.windowDays} days fits this class, student and set together.
        </p>
        <div className="ms-teacher-empty__actions">
          <Link href="/teacher/reviews" className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center">
            Clear filters
          </Link>
        </div>
      </div>
    )
  }
  return (
    <div className="ms-teacher-empty">
      <span className="ms-teacher-empty__icon" aria-hidden>
        IN
      </span>
      <h2 className="ms-teacher-empty__title">Waiting for ink</h2>
      <p className="ms-teacher-empty__body">
        When students in your classes mark work in the class&apos;s subject, their scripts land here — the ones most
        worth a second look first.
      </p>
    </div>
  )
}

/**
 * The review inbox (spec §4): the server renders page one of the queue for
 * the filters in the URL — priority first, each slip saying why with warning
 * chips — and "Load more" follows the keyset cursor. Filters are a GET form,
 * so every view is a plain URL.
 *
 * Filtered to one class (the class pages' Reviews tab links here), it keeps
 * the class frame — the class head and its tabs, with Reviews current — so
 * the teacher can go straight back to the class's Week, Sets or Students.
 */
export default async function TeacherReviewsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const parsed = parseReviewFilters(sp)
  const filters = parsed.ok ? parsed.value : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/auth/signin?next=${encodeURIComponent(filters ? reviewsInboxHref(filters) : '/teacher/reviews')}`)
  }
  const teacher = await requireTeacher(supabase, user.id)
  if (!teacher.ok) redirect('/dashboard')
  // A hand-edited id that is not an id is the same answer as someone else's class.
  if (!filters) notFound()

  const rawCursor = Array.isArray(sp.cursor) ? sp.cursor[0] : sp.cursor
  // A stale or mangled cursor starts from the top rather than erroring.
  const cursor = decodeReviewCursor(rawCursor ?? null)

  const [queue, frame] = await Promise.all([
    loadReviewQueue(supabase, createServiceClient(), user.id, filters, { withOptions: true }).catch(
      (err: unknown): ReviewQueueLoad | null => {
        console.error('[teacher/reviews] queue failed:', err instanceof Error ? err.message : err)
        return null
      }
    ),
    // The class frame is decoration: if it cannot be read the inbox still renders, without it.
    filters.classroom_id
      ? loadTeacherClassroom(supabase, user.id, filters.classroom_id).catch(
          (err: unknown): TeacherClassroomRow | null => {
            console.error('[teacher/reviews] class frame failed:', err instanceof Error ? err.message : err)
            return null
          }
        )
      : Promise.resolve<TeacherClassroomRow | null>(null),
  ])
  if (queue && !queue.ok) notFound()

  const query = reviewFilterQuery(filters)
  const page = queue?.ok ? pageReviewItems(queue.items, cursor, DEFAULT_REVIEW_PAGE) : null
  const pending = queue?.ok ? queue.counts.pending : 0

  const note = pending > 0 ? `${pending} waiting for you` : undefined

  return (
    <TeacherPageContainer className="ms-teacher-page">
      <OmniAIBridge context={teacherOmniContext({ classroomId: filters.classroom_id ?? null, view: 'reviews' })} />
      {frame ? (
        <>
          <ClassDeskHead classroom={frame} eyebrow="Reviews" note={note} />
          <ClassTabs classroomId={frame.id} current="reviews" v2={isTeacherV2()} />
          <p className="mb-6 text-sm text-[var(--ec-text-secondary)]">
            Scripts to check in this class, highest priority first — the chips say why. Confirm the AI mark, change
            it, or flag it to come back to.
          </p>
        </>
      ) : (
        <TeacherDeskHead
          eyebrow="Reviews"
          stamp="RV"
          title="Scripts to check"
          lead="Highest priority first — the chips say why. Confirm the AI mark, change it, or flag it to come back to."
          note={note}
        />
      )}

      {!queue?.ok ? (
        <div className="ms-teacher-error" role="alert">
          <p className="ms-teacher-error__title">Couldn&apos;t load your scripts</p>
          <p className="ms-teacher-error__body">Something went wrong reading them. Reload the page to try again.</p>
        </div>
      ) : (
        <>
          {queue.options && queue.liveClassCount > 0 ? (
            <ReviewFilters options={queue.options} values={filters} counts={queue.counts} />
          ) : null}

          {queue.counts.total > 0 ? (
            <p className="mb-4 text-sm text-[var(--ec-text-secondary)]">
              {countLine(queue.counts)}
              <span className="block text-xs text-[var(--ec-text-faint)]">
                {queue.truncated
                  ? `Showing the newest scripts marked in the last ${queue.windowDays} days — narrow the filters to see the rest.`
                  : `Work marked in the last ${queue.windowDays} days${filters.assignment_id ? ', and every hand-in for this set' : ''}.`}
              </span>
            </p>
          ) : null}

          {page && page.items.length > 0 ? (
            <section aria-label="Scripts">
              <ReviewQueueList
                items={page.items}
                nextCursor={page.next_cursor}
                query={query}
                showClass={!filters.classroom_id}
              />
              {cursor ? (
                <p className="mt-4">
                  <Link href={reviewsInboxHref(filters)} className="ec-link inline-flex min-h-[44px] items-center">
                    &larr; Back to the top of the list
                  </Link>
                </p>
              ) : null}
            </section>
          ) : cursor && queue.items.length > 0 ? (
            <div className="ms-teacher-empty">
              <span className="ms-teacher-empty__icon" aria-hidden>
                END
              </span>
              <h2 className="ms-teacher-empty__title">That&apos;s the end of the list</h2>
              <p className="ms-teacher-empty__body">The scripts may have moved since this page was loaded.</p>
              <div className="ms-teacher-empty__actions">
                <Link
                  href={reviewsInboxHref(filters)}
                  className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center"
                >
                  Back to the top
                </Link>
              </div>
            </div>
          ) : (
            <EmptyQueue queue={queue} filters={filters} />
          )}
        </>
      )}
    </TeacherPageContainer>
  )
}
