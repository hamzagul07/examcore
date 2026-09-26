import { LoadingLink } from '@/components/ui/LoadingLink'
import { LocalTime } from '@/components/teacher/assignments/LocalTime'
import { kindLabel, progressLabel, type StudentAssignment } from '@/lib/student/assignment-state'

/**
 * "Set by your teacher" on the student dashboard (docs/TEACHER_SYSTEM_SPEC.md
 * §4): the next open set, a crimson DUE (or LATE) stamp when it is close or
 * past its deadline, how many sets are open, and "See all". The dashboard
 * does not render it at all when nothing is open.
 *
 * A server component; the links and the deadline are small client islands
 * (LoadingLink, LocalTime — the deadline is shown in the reader's own zone).
 */
export function AssignmentsSetCard({
  next,
  openCount,
  timeZone,
  now,
}: {
  next: StudentAssignment
  openCount: number
  /** The server's time-zone guess for the first paint. */
  timeZone: string
  /** ISO instant "Today / Tomorrow" is relative to. */
  now: string
}) {
  const stamp = next.state === 'overdue' ? 'LATE' : next.due_soon ? 'DUE' : null
  const others = openCount - 1

  return (
    <section className="ms-assign-card" aria-label="Set by your teacher">
      <header className="ms-assign-card__head">
        <p className="ms-assign-card__eyebrow">{next.deadline ? 'Next due' : 'Next up'}</p>
        {stamp ? (
          <span className="ms-assign-card__due" aria-label={stamp === 'LATE' ? 'Past the deadline' : 'Due soon'}>
            {stamp}
          </span>
        ) : null}
      </header>
      <LoadingLink href={next.href} variant="card" className="ms-assign-card__next">
        <span className="ms-assign-card__title">{next.title}</span>
        <span className="ms-assign-card__meta">
          {next.classroom.name} · {kindLabel(next.kind)}
          {next.is_mock ? ' · Mock' : ''}
        </span>
        <span className="ms-assign-card__meta">
          {next.deadline ? (
            <>
              {next.state === 'overdue' ? 'Was due ' : 'Due '}
              <LocalTime iso={next.deadline} timeZone={timeZone} now={now} />
              {next.extended ? ' (extended)' : ''}
              {' · '}
            </>
          ) : null}
          {progressLabel(next)}
        </span>
      </LoadingLink>
      <footer className="ms-assign-card__foot">
        <span className="ms-assign-card__count">
          {openCount} open{others > 0 ? ` · ${others} more` : ''}
        </span>
        <LoadingLink href="/dashboard/assignments" variant="inline" className="ms-assign-card__all">
          See all
        </LoadingLink>
      </footer>
    </section>
  )
}
