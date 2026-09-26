import Link from 'next/link'
import { LocalTime } from '@/components/teacher/assignments/LocalTime'
import { setHref } from '@/components/teacher/assignments/links'
import { matrixCell, matrixColumns } from '@/components/teacher/assignments/matrix-cells'
import { KIND_LABEL, KIND_STAMP } from '@/components/teacher/assignments/set-display'
import {
  OUTCOME_CELL,
  OUTCOME_LABEL,
  type StudentSetRecordRow,
} from '@/lib/teacher/insights/student-record'

/**
 * One student's record on the class's sets (spec §4 `.../students/[studentId]`:
 * StudentAssignmentRecord), newest deadline first: each set as a slip with
 * its outcome for them — handed in, late, part done, missing, excused — and
 * one cell per item, drawn exactly as the completion matrix draws it (the
 * same glyphs, classes and review links, from matrix-cells), so the two
 * pages can never tell a teacher different things.
 *
 * Only sets that are for this student are listed (a targeted set for others,
 * or one published before they joined and due before it, is not theirs).
 * Presentational and hook-free: the page loads the rows on the server
 * (loadStudentSets → buildStudentSetRecord) and passes `error` when they
 * could not be read — never an empty record in place of a failed one.
 */
export function StudentAssignmentRecord({
  classroomId,
  rows,
  error = null,
  firstName,
  timeZone,
  nowIso,
  archived = false,
  headingId = 'student-record-title',
}: {
  classroomId: string
  rows: readonly StudentSetRecordRow[]
  error?: string | null
  /** "Amira" — for headings and cell labels. */
  firstName: string
  /** The server's best guess at the reader's zone; LocalTime switches to the browser's own. */
  timeZone: string
  /** When the page was computed, so "Today" agrees on server and client. */
  nowIso: string
  /** An archived class shows the hand-ins it kept, read-only. */
  archived?: boolean
  headingId?: string
}) {
  if (error) {
    return (
      <section className="ms-teacher-error mb-8" role="alert" aria-labelledby={headingId}>
        <h2 id={headingId} className="ms-teacher-error__title">
          {firstName}&apos;s sets didn&apos;t load
        </h2>
        <p className="ms-teacher-error__body">{error}</p>
      </section>
    )
  }

  if (rows.length === 0) {
    return (
      <section className="ms-teacher-empty mb-8" aria-labelledby={headingId}>
        <span className="ms-teacher-empty__icon" aria-hidden>
          SET
        </span>
        <h2 id={headingId} className="ms-teacher-empty__title">
          No sets for {firstName} yet
        </h2>
        <p className="ms-teacher-empty__body">
          {archived
            ? 'This class had no published sets for them while it was active.'
            : 'Sets you publish to the whole class, or to them, will be listed here with what they handed in.'}
        </p>
      </section>
    )
  }

  return (
    <section className="mb-8" aria-labelledby={headingId}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={headingId} className="ms-teacher-section-title">
          Sets
        </h2>
        <p className="text-sm text-[var(--ec-text-secondary)]">
          {rows.length} {rows.length === 1 ? 'set' : 'sets'} for {firstName}
          {archived ? ' · kept from when the class was active' : ''}
        </p>
      </div>
      <ol className="flex list-none flex-col gap-3 p-0">
        {rows.map((row) => (
          <RecordSlip key={row.id} row={row} classroomId={classroomId} firstName={firstName} timeZone={timeZone} nowIso={nowIso} />
        ))}
      </ol>
    </section>
  )
}

function RecordSlip({
  row,
  classroomId,
  firstName,
  timeZone,
  nowIso,
}: {
  row: StudentSetRecordRow
  classroomId: string
  firstName: string
  timeZone: string
  nowIso: string
}) {
  const columns = matrixColumns(row.items)
  const byItem = new Map(row.cells.map((c) => [c.item_id, c]))
  const classes = ['ms-set-slip']
  if (row.status === 'closed') classes.push('ms-set-slip--closed')
  if (row.is_mock) classes.push('ms-set-slip--mock')
  const late = row.outcome === 'late'
  const overdue = row.outcome === 'missing'

  return (
    <li className={classes.join(' ')}>
      <span className="ms-set-slip__stamp" aria-hidden>
        {KIND_STAMP[row.kind]}
      </span>
      <div className="ms-set-slip__body">
        <Link
          href={setHref(classroomId, row.id)}
          className="ms-set-slip__title inline-flex min-h-[44px] items-center self-start hover:underline"
        >
          {row.title}
        </Link>
        <span className="ms-set-slip__meta">
          <span>{KIND_LABEL[row.kind]}</span>
          {row.is_mock ? <span className="ms-teacher-chip ms-teacher-chip--mock">Mock</span> : null}
          {row.due_at ? (
            <span className={`ms-set-slip__due${overdue || late ? ' ms-set-slip__due--late' : ''}`}>
              {row.extended ? 'Extended to ' : 'Due '}
              <LocalTime iso={row.due_at} timeZone={timeZone} now={nowIso} />
            </span>
          ) : (
            <span className="ms-set-slip__due">No deadline</span>
          )}
          {row.status === 'closed' ? <span>Closed</span> : null}
        </span>
        {columns.length > 0 ? (
          <ul className="mt-1 flex list-none flex-wrap gap-1.5 p-0" aria-label={`${firstName}'s items on ${row.title}`}>
            {columns.map((column) => {
              const input = byItem.get(column.item_id)
              if (!input) return null
              const cell = matrixCell(input, { studentName: firstName, column })
              return (
                <li key={column.item_id} className="inline-flex items-center gap-1">
                  <span className="font-mono text-[10px] font-bold text-[var(--ec-text-secondary)]" aria-hidden>
                    {column.label}
                  </span>
                  {cell.href ? (
                    // The link wraps the chip so the tap target is 44px tall
                    // while the chip keeps the matrix's look.
                    <Link
                      href={cell.href}
                      className="inline-flex min-h-[44px] items-center"
                      aria-label={cell.label}
                      title={column.title}
                    >
                      <span className={cell.className}>{cell.text}</span>
                    </Link>
                  ) : (
                    <span className={cell.className} title={column.title}>
                      <span aria-hidden>{cell.text}</span>
                      <span className="sr-only">{cell.label}</span>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
      <span className="ms-set-slip__tally text-right">
        <span className={`ms-set-matrix__cell ms-set-matrix__cell--${OUTCOME_CELL[row.outcome]}`}>
          {OUTCOME_LABEL[row.outcome]}
        </span>
        <small>
          {row.overall_pct !== null
            ? `${Math.round(row.overall_pct)}%`
            : `${row.handed_in}/${row.items.length} in`}
        </small>
      </span>
    </li>
  )
}
