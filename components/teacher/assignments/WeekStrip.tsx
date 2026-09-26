import Link from 'next/link'
import type { AssignmentSummary } from '@/lib/teacher/types'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { AssignmentSlip } from '@/components/teacher/assignments/AssignmentSlip'
import { classHref, composerHref, reviewsHref } from '@/components/teacher/assignments/links'
import type { SetBar } from '@/components/teacher/assignments/set-display'

export type WeekStripSet = { summary: AssignmentSummary; bar?: SetBar; late_names?: readonly string[] }

/**
 * The class week's sets (docs/TEACHER_SYSTEM_SPEC.md §4: "open sets as
 * `.ms-set-slip` with `.ms-class-due__bar` done/late/missing and '3 late:
 * Amira, Ben, +1'"): every set that was live during the week, soonest due
 * first, with the week's hand-in and review counts above them and links to
 * the weeks either side.
 *
 * A server component; the slips link to the sets, the counts to the review
 * inbox. `canSetWork` is false for an archived class or with v2 off.
 */
export function WeekStrip({
  classroomId,
  weekKey,
  rangeLabel,
  isCurrent,
  prev,
  next,
  sets,
  submissionsDelta,
  unreviewed,
  timeZone,
  now,
  canSetWork,
}: {
  classroomId: string
  weekKey: string
  rangeLabel: string | null
  isCurrent: boolean
  prev: string | null
  next: string | null
  sets: readonly WeekStripSet[]
  submissionsDelta: number
  unreviewed: number
  timeZone?: string
  now: string
  canSetWork: boolean
}) {
  const heading = isCurrent ? 'This week' : `Week of ${rangeLabel ?? weekKey}`
  const facts = [
    isCurrent && rangeLabel ? rangeLabel : null,
    `${sets.length} ${sets.length === 1 ? 'set' : 'sets'} live`,
    `${submissionsDelta} ${submissionsDelta === 1 ? 'hand-in' : 'hand-ins'}`,
  ].filter(Boolean)

  return (
    <section aria-labelledby="week-sets-title" className="mb-8">
      <div className="ms-class-due__head">
        <div className="min-w-0">
          <h2 id="week-sets-title" className="ms-class-due__title">
            {heading}
          </h2>
          <p className="ms-class-due__sub">
            {facts.join(' · ')}
            {unreviewed > 0 ? (
              <>
                {' · '}
                <Link href={reviewsHref(classroomId)} className="ec-link">
                  {unreviewed} {unreviewed === 1 ? 'script' : 'scripts'} to review
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <nav aria-label="Other weeks" className="flex flex-wrap gap-2">
          {prev ? (
            <Link
              href={classHref(classroomId, prev)}
              className="ec-btn-ghost inline-flex min-h-[44px] items-center text-sm"
            >
              <span aria-hidden>←&nbsp;</span>Previous week
            </Link>
          ) : null}
          {!isCurrent ? (
            <Link href={classHref(classroomId)} className="ec-btn-ghost inline-flex min-h-[44px] items-center text-sm">
              This week
            </Link>
          ) : null}
          {next ? (
            <Link
              href={classHref(classroomId, next)}
              className="ec-btn-ghost inline-flex min-h-[44px] items-center text-sm"
            >
              Next week<span aria-hidden>&nbsp;→</span>
            </Link>
          ) : null}
        </nav>
      </div>

      {sets.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {sets.map((s) => (
            <li key={s.summary.id}>
              <AssignmentSlip
                classroomId={classroomId}
                summary={s.summary}
                bar={s.bar}
                lateNames={s.late_names}
                timeZone={timeZone}
                now={now}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="ms-teacher-empty">
          <span className="ms-teacher-empty__icon" aria-hidden>
            WK
          </span>
          <h3 className="ms-teacher-empty__title">
            {isCurrent ? 'Nothing set this week' : 'Nothing was set that week'}
          </h3>
          <p className="ms-teacher-empty__body">
            {isCurrent
              ? 'Set a past-paper question, a topic drill, a whole paper or your own prompt. Hand-ins land here as students mark them, with who is late.'
              : 'No set was open during this week. Pick another week, or go back to this one.'}
          </p>
          {isCurrent && canSetWork ? (
            <div className="ms-teacher-empty__actions">
              <LoadingLink
                href={composerHref(classroomId)}
                loadingText="Opening…"
                className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center"
              >
                Set work
              </LoadingLink>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
