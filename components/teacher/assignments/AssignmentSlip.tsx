import { cn } from '@/lib/utils'
import type { AssignmentSummary } from '@/lib/teacher/types'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { LocalTime } from '@/components/teacher/assignments/LocalTime'
import { setHref } from '@/components/teacher/assignments/links'
import {
  KIND_LABEL,
  KIND_STAMP,
  barFromSummary,
  barWidths,
  itemCountLabel,
  lateLine,
  tallyText,
  type SetBar,
} from '@/components/teacher/assignments/set-display'

/**
 * One set filed as a slip (`.ms-set-slip`; docs/TEACHER_SYSTEM_SPEC.md §4):
 * kind stamp (Q · PPR · DRL · PRM), title, MOCK / DRAFT / CLOSED chips, due
 * date in the teacher's time zone, the done / late / missing bar, "3 late:
 * Amira K., Ben O., +1", and the hand-in tally. The whole slip opens the set.
 *
 * Used by the Sets list and the class week's WeekStrip. Hook-free, so it
 * renders from a server component or inside a client list alike. Pass `bar`
 * and `lateNames` when per-student detail is known (the week loader); without
 * them the bar is estimated from the summary's counts.
 */
export function AssignmentSlip({
  classroomId,
  summary,
  bar,
  lateNames = [],
  timeZone,
  now,
}: {
  classroomId: string
  summary: AssignmentSummary
  bar?: SetBar
  lateNames?: readonly string[]
  /** The server's time-zone guess for the first paint (see LocalTime). */
  timeZone?: string
  /** ISO instant the page was computed at. */
  now: string
}) {
  const draft = summary.status === 'draft'
  const closed = summary.status === 'closed'
  const nowMs = Date.parse(now)
  const overdue =
    summary.status === 'open' && summary.due_at !== null && Date.parse(summary.due_at) < nowMs
  const shown = bar ?? barFromSummary(summary)
  const widths = barWidths(shown)
  const late = draft ? null : lateLine(lateNames, summary.late)

  return (
    <LoadingLink
      href={setHref(classroomId, summary.id)}
      variant="card"
      className={cn(
        'ms-set-slip',
        draft && 'ms-set-slip--draft',
        closed && 'ms-set-slip--closed',
        summary.is_mock && 'ms-set-slip--mock'
      )}
    >
      <span className="ms-set-slip__stamp" aria-hidden>
        {KIND_STAMP[summary.kind]}
      </span>
      <span className="ms-set-slip__body">
        <span className="ms-set-slip__title">{summary.title}</span>
        <span className="ms-set-slip__meta">
          <span className="sr-only">{KIND_LABEL[summary.kind]}.</span>
          {summary.is_mock ? <span className="ms-teacher-chip ms-teacher-chip--mock">Mock</span> : null}
          {draft ? <span className="ms-teacher-chip ms-teacher-chip--draft">Draft</span> : null}
          {closed ? <span className="ms-teacher-chip">Closed</span> : null}
          <span className={cn('ms-set-slip__due', overdue && 'ms-set-slip__due--late')}>
            {summary.due_at ? (
              <>
                {overdue ? 'Was due ' : 'Due '}
                <LocalTime iso={summary.due_at} timeZone={timeZone} now={now} />
              </>
            ) : (
              'No due date'
            )}
          </span>
          <span>{itemCountLabel(summary.kind, summary.item_count)}</span>
        </span>
        {!draft && shown.total > 0 ? (
          <span className="ms-class-due__bar" aria-hidden>
            {widths.done > 0 ? (
              <span className="ms-class-due__fill ms-class-due__fill--done" style={{ width: `${widths.done}%` }} />
            ) : null}
            {widths.late > 0 ? (
              <span className="ms-class-due__fill ms-class-due__fill--late" style={{ width: `${widths.late}%` }} />
            ) : null}
            {widths.owing > 0 ? (
              <span className="ms-class-due__fill ms-class-due__fill--missing" style={{ width: `${widths.owing}%` }} />
            ) : null}
          </span>
        ) : null}
        {late ? <span className="ms-set-slip__late">{late}</span> : null}
      </span>
      <span className="ms-set-slip__tally">
        {draft ? (
          <>
            —<small>not set yet</small>
          </>
        ) : (
          <>
            {tallyText(summary)}
            <small>handed in</small>
          </>
        )}
      </span>
    </LoadingLink>
  )
}
