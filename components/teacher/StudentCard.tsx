import Link from 'next/link'
import type { ReactNode } from 'react'
import { studentHref } from '@/components/teacher/assignments/links'
import { relativeDay } from '@/lib/teacher/insights/format'
import { OUTCOME_CELL, OUTCOME_LABEL, type RosterSetCell } from '@/lib/teacher/insights/student-record'
import type { RosterStudent } from '@/lib/teacher/types'

/** The visible glyph for a latest-set outcome; the words are always there for screen readers. */
function outcomeGlyph(cell: RosterSetCell): string {
  switch (cell.outcome) {
    case 'complete':
      return cell.detail ? `✓ ${cell.detail}` : '✓'
    case 'late':
      return cell.detail ? `L ${cell.detail}` : 'L'
    case 'partial':
      return cell.detail
    case 'to_do':
      return 'To do'
    case 'missing':
      return '—'
    case 'excused':
      return 'EXC'
    case 'before_joining':
      return 'NEW'
    case 'left':
      return 'LEFT'
  }
}

function nameOf(s: Pick<RosterStudent, 'full_name'>): string {
  return s.full_name?.trim() || 'Unnamed student'
}

/**
 * One row of the class roster (spec §4 `.../students`): name, when they
 * joined and last marked work in this class, their state on the class's
 * latest set, overdue sets and topics due for review, and a LEFT / REMOVED
 * chip for anyone no longer in the class.
 *
 * Students who left or were removed stay listed — the record of who was in
 * the class — but their work is no longer the teacher's to see, so their
 * row has no link and no figures. Full names are fine here: this is the
 * teacher's own screen (names reach prompts and emails only through
 * displayName).
 *
 * A server component; `actions` is where the page puts the Remove island.
 */
export function StudentCard({
  classroomId,
  student,
  latest,
  nowMs,
  actions,
}: {
  classroomId: string
  student: RosterStudent
  /** Their cell on the class's latest set, or null (no set yet, or it is not for them). */
  latest: { title: string; cell: RosterSetCell } | null
  /** When the page was computed. */
  nowMs: number
  actions?: ReactNode
}) {
  const active = student.status === 'active'
  const name = nameOf(student)
  const joined = relativeDay(student.joined_at, nowMs)
  const last = relativeDay(student.last_attempt_at, nowMs)

  return (
    <li className={`ms-teacher-roster__row${active ? '' : ' ms-teacher-roster__row--inactive'}`}>
      <div className="ms-teacher-roster__who">
        {active ? (
          <Link href={studentHref(classroomId, student.id)} className="ms-teacher-roster__name hover:underline">
            {name}
          </Link>
        ) : (
          <span className="ms-teacher-roster__name">{name}</span>
        )}
        <span className="ms-teacher-roster__meta">
          {active
            ? [joined ? `joined ${joined}` : null, last ? `last marked ${last}` : 'no marked work in this class yet']
                .filter(Boolean)
                .join(' · ')
            : student.status === 'left'
              ? 'Left the class — their work is no longer shown'
              : 'Removed from the class — their work is no longer shown'}
        </span>
      </div>

      <span className="ms-teacher-roster__trail">
        {!active ? (
          <span className={`ms-teacher-chip ms-teacher-chip--${student.status === 'left' ? 'left' : 'removed'}`}>
            {student.status === 'left' ? 'Left' : 'Removed'}
          </span>
        ) : (
          <>
            {latest ? (
              <span
                className={`ms-set-matrix__cell ms-set-matrix__cell--${OUTCOME_CELL[latest.cell.outcome]}`}
                title={`${latest.title}: ${OUTCOME_LABEL[latest.cell.outcome]}`}
              >
                <span aria-hidden>{outcomeGlyph(latest.cell)}</span>
                <span className="sr-only">
                  Latest set, {latest.title}: {OUTCOME_LABEL[latest.cell.outcome]}
                  {latest.cell.detail ? `, ${latest.cell.detail}` : ''}
                </span>
              </span>
            ) : null}
            {student.open_late > 0 ? (
              <span className="ms-teacher-chip ms-teacher-chip--due">{student.open_late} overdue</span>
            ) : null}
            {student.due_count > 0 ? (
              <span className="ms-roster-due">
                {student.due_count} due<span className="sr-only"> for review</span>
              </span>
            ) : null}
          </>
        )}
        {actions}
      </span>
    </li>
  )
}
