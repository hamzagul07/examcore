import type { CSSProperties } from 'react'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { accentCssVar, getSubjectAccent } from '@/lib/design-system/subject-accents'
import { formatInviteCode } from '@/lib/teacher/invite-code'
import { subjectCodeLabel, subjectStamp } from '@/lib/teacher/list-classrooms'
import type { TeacherOverview } from '@/lib/teacher/types'

/** One class as the desk and the class list show it: the overview row plus optional details. */
export type DeskClass = TeacherOverview['classes'][number] & {
  invite_code?: string | null
  year_group?: string | null
  demo?: boolean
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

function Tally({ c }: { c: DeskClass }) {
  const cells = [
    { key: 'due', n: c.due_this_week, label: 'due this week', alert: false },
    { key: 'review', n: c.unreviewed, label: 'to review', alert: c.unreviewed > 0 },
    { key: 'late', n: c.late_students, label: 'overdue', alert: c.late_students > 0 },
  ].filter((cell) => cell.n > 0)

  if (!cells.length) {
    return (
      <dl className="ms-teacher-class-slip__tally">
        <div>
          <dt>nothing waiting</dt>
          <dd aria-hidden>—</dd>
        </div>
      </dl>
    )
  }
  return (
    <dl className="ms-teacher-class-slip__tally">
      {cells.map((cell) => (
        <div key={cell.key} className={cell.alert ? 'is-alert' : undefined}>
          <dt>{cell.label}</dt>
          <dd>{cell.n}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * The teacher's classes as filing slips (`.ms-teacher-class-slip`): a subject
 * stamp in the class's accent colour, the name, "24 students · 2 open sets",
 * and a mini tally of what is waiting — due this week, to review, overdue.
 * Archived classes render muted with their size only; they open read-only.
 *
 * Server component: every number comes from TeacherOverview, loaded once by
 * the page.
 */
export function ClassSlipList({
  classes,
  headingLevel = 'h2',
}: {
  classes: readonly DeskClass[]
  /** Heading level of each class name, so the page outline stays in order. */
  headingLevel?: 'h2' | 'h3'
}) {
  const Name = headingLevel
  return (
    <ul className="ms-teacher-class-list">
      {classes.map((c) => {
        const style = { '--acc': accentCssVar(getSubjectAccent(c.subject_code)) } as CSSProperties
        const meta = [
          count(c.members, 'student', 'students'),
          c.archived ? null : count(c.open_assignments, 'open set', 'open sets'),
          c.year_group || null,
        ].filter(Boolean)
        return (
          <li key={c.id}>
            <LoadingLink
              href={`/teacher/classroom/${c.id}`}
              variant="card"
              className={`ms-teacher-class-slip${c.archived ? ' ms-teacher-class-slip--archived' : ''}`}
              style={style}
            >
              <span className="ms-teacher-class-slip__stamp" title={subjectCodeLabel(c.subject_code)} aria-hidden>
                {subjectStamp(c.subject_code)}
              </span>
              <div className="ms-teacher-class-slip__body">
                <Name className="ms-teacher-class-slip__name">
                  {c.name}
                  {c.demo ? (
                    <>
                      {' '}
                      <span className="ms-teacher-chip ms-teacher-chip--demo">Example</span>
                    </>
                  ) : null}
                  {c.archived ? (
                    <>
                      {' '}
                      <span className="ms-teacher-chip ms-teacher-chip--archived">Archived</span>
                    </>
                  ) : null}
                </Name>
                <span className="ms-teacher-class-slip__meta block">
                  <span className="sr-only">{subjectCodeLabel(c.subject_code)}. </span>
                  {meta.join(' · ')}
                  {c.invite_code && !c.archived ? (
                    <>
                      {' · code '}
                      <span className="ms-teacher-class-slip__code">{formatInviteCode(c.invite_code)}</span>
                    </>
                  ) : null}
                </span>
                {c.headline_gap && !c.archived ? (
                  <span className="ms-teacher-class-slip__meta block">
                    Last set&apos;s gap: {c.headline_gap}
                  </span>
                ) : null}
                {c.archived ? null : <Tally c={c} />}
              </div>
              <span className="ms-teacher-class-slip__go" aria-hidden>
                {c.archived ? 'View ->' : 'Open ->'}
              </span>
            </LoadingLink>
          </li>
        )
      })}
    </ul>
  )
}
