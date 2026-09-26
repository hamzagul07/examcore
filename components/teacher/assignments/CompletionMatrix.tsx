import Link from 'next/link'
import type { ReactNode } from 'react'
import type { AssignmentItem, AssignmentProgress } from '@/lib/teacher/types'
import {
  CELL_GLYPH,
  CELL_MEANING,
  MATRIX_STATES,
  buildMatrix,
  cellClassName,
  type MatrixCell,
  type MatrixRow,
} from '@/components/teacher/assignments/matrix-cells'

function Cell({ cell, prefix }: { cell: MatrixCell; prefix?: string }) {
  const text = prefix ? `${prefix} ${cell.text}` : cell.text
  if (cell.href) {
    // On the phone slips (prefix set) a cell is a thumb target: full 44px.
    return (
      <Link href={cell.href} className={prefix ? `${cell.className} min-h-[44px]` : cell.className} aria-label={cell.label}>
        {text}
      </Link>
    )
  }
  return (
    <span className={cell.className}>
      <span aria-hidden>{text}</span>
      <span className="sr-only">{cell.label}</span>
    </span>
  )
}

function Chips({ row }: { row: MatrixRow }) {
  if (row.chips.length === 0) return null
  return (
    <>
      {row.chips.map((c) => (
        <span key={c.text} className={`ms-teacher-chip ms-teacher-chip--${c.modifier} ml-1.5`} title={c.title}>
          <span aria-hidden>{c.text}</span>
          <span className="sr-only">{c.title}</span>
        </span>
      ))}
    </>
  )
}

function Name({ row }: { row: MatrixRow }) {
  return row.href ? <Link href={row.href}>{row.name}</Link> : <span>{row.name}</span>
}

/**
 * Who has handed in what (docs/TEACHER_SYSTEM_SPEC.md §4 `.../assignments/[aid]`:
 * `.ms-set-matrix`, students × items; cells `✓ 7/9`, `L 4/9`, `RV`, `—`,
 * `EXC`, `LEFT`; sticky first column; ≤640px per-student slips).
 *
 * A server component. Cells come from matrix-cells.ts over the set's
 * progress (P0 state rules). Every hand-in with a script behind it is a link
 * to that script in the review console, so the matrix is navigable by
 * keyboard cell by cell; other cells carry their meaning as screen-reader
 * text. The table scrolls sideways inside a focusable region; at phone width
 * CSS swaps it for one slip per student (only one of the two is ever
 * displayed, so assistive tech never reads both).
 *
 * Empty states follow the spec: nobody on the set, or "Waiting for ink —
 * 0 of 24 handed in" (with `emptyAction`, e.g. Remind) before any hand-in.
 */
export function CompletionMatrix({
  classroomId,
  title,
  items,
  progress,
  emptyAction,
}: {
  classroomId: string
  /** The set's title, for the table caption. */
  title: string
  items: readonly AssignmentItem[]
  progress: AssignmentProgress
  emptyAction?: ReactNode
}) {
  const matrix = buildMatrix(progress, items, { classroomId })
  const total = progress.total_students

  if (matrix.rows.length === 0) {
    return (
      <div className="ms-teacher-empty mb-8">
        <span className="ms-teacher-empty__icon" aria-hidden>
          —
        </span>
        <h2 className="ms-teacher-empty__title">Nobody is on this set yet</h2>
        <p className="ms-teacher-empty__body">
          Students who join the class see sets set for the whole class; hand-ins appear here as they mark them.
        </p>
      </div>
    )
  }

  if (matrix.anyHandedIn === 0) {
    return (
      <div className="ms-teacher-empty mb-8">
        <span className="ms-teacher-empty__icon" aria-hidden>
          INK
        </span>
        <h2 className="ms-teacher-empty__title">
          Waiting for ink — 0 of {total} handed in
        </h2>
        <p className="ms-teacher-empty__body">
          Marks appear here as students hand in, including work they mark from /mark on the same questions.
        </p>
        {emptyAction ? <div className="ms-teacher-empty__actions">{emptyAction}</div> : null}
      </div>
    )
  }

  return (
    <section className="ms-set-matrix" aria-labelledby="matrix-title">
      <div className="ms-class-due__head">
        <div className="min-w-0">
          <h2 id="matrix-title" className="ms-class-due__title">
            Hand-ins
          </h2>
          <p className="ms-class-due__sub">
            {progress.handed_in} of {total} handed in everything · class mean {matrix.classMean}. Select a mark to
            open the script.
          </p>
        </div>
      </div>

      <div className="ms-set-matrix__scroll" role="region" aria-labelledby="matrix-title" tabIndex={0}>
        <table className="ms-set-matrix__table">
          <caption className="sr-only">
            {title}: each student&apos;s hand-in on each item, with marks.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="ms-set-matrix__student">
                Student
              </th>
              {matrix.columns.map((c) => (
                <th key={c.item_id} scope="col" title={c.title}>
                  <span className="ms-set-matrix__item-head">
                    <span aria-hidden>{c.label}</span>
                    {c.sub ? <small aria-hidden>{c.sub}</small> : null}
                    <span className="sr-only">{c.title}</span>
                  </span>
                </th>
              ))}
              <th scope="col">Overall</th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.student_id} className={row.membership !== 'active' ? 'ms-set-matrix__row--left' : undefined}>
                <th scope="row" className="ms-set-matrix__student">
                  <Name row={row} />
                  <Chips row={row} />
                </th>
                {row.cells.map((cell) => (
                  <td key={cell.item_id}>
                    <Cell cell={cell} />
                  </td>
                ))}
                <td className="font-mono font-bold">{row.overall}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="ms-set-matrix__student">
                Class mean
              </th>
              {matrix.means.map((m, i) => (
                <td key={matrix.columns[i].item_id} className="font-mono text-xs text-[var(--ec-text-secondary)]">
                  {m}
                </td>
              ))}
              <td className="font-mono font-bold">{matrix.classMean}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <ul className="ms-set-matrix__slips" aria-label="Hand-ins by student">
        {matrix.rows.map((row) => (
          <li key={row.student_id} className="ms-set-matrix__slip">
            <div className="ms-set-matrix__slip-head">
              <span className="min-w-0">
                <Name row={row} />
                <Chips row={row} />
              </span>
              <span className="font-mono text-sm">
                <span className="sr-only">Overall </span>
                {row.overall}
              </span>
            </div>
            <div className="ms-set-matrix__slip-cells">
              {row.cells.map((cell, i) => (
                <Cell key={cell.item_id} cell={cell} prefix={matrix.columns[i].label} />
              ))}
            </div>
          </li>
        ))}
      </ul>

      <ul className="mt-3 flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-xs text-[var(--ec-text-secondary)]" aria-label="Key">
        {MATRIX_STATES.map((state) => (
          <li key={state} className="inline-flex items-center gap-1.5">
            <span className={cellClassName(state)} aria-hidden>
              {CELL_GLYPH[state]}
            </span>
            {CELL_MEANING[state]}
          </li>
        ))}
      </ul>
    </section>
  )
}
