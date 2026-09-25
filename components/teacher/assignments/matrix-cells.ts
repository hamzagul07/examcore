/**
 * The completion matrix's cells, columns and rows
 * (docs/TEACHER_SYSTEM_SPEC.md §4 `.../assignments/[aid]`: students × items;
 * cells `✓ 7/9` brand, `L 4/9` crimson outline, `RV` reviewed, `—` missing,
 * `EXC`, `LEFT`).
 *
 * Every cell's STATE comes from the set's progress (deriveStudentState, P0) —
 * this module only decides how a state reads: its glyph and marks, its
 * `.ms-set-matrix__cell--*` modifier, the sentence a screen reader hears, and
 * where it links. The glyph is part of the text so a state never depends on
 * colour alone, and a cell with a script behind it links to that script in
 * the review console.
 *
 * Pure; safe on client and server.
 */

import { HANDED_IN_STATES } from '@/lib/teacher/assignment-status'
import { NO_DATA } from '@/lib/teacher/stat-display'
import type {
  AssignmentItem,
  AssignmentProgress,
  MembershipStatus,
  StudentAssignmentState,
  StudentItemState,
} from '@/lib/teacher/types'
import { reviewHref, studentHref } from '@/components/teacher/assignments/links'

export const MATRIX_STATES: readonly StudentItemState[] = ['done', 'late', 'reviewed', 'missing', 'excused', 'left']

/** The visible glyph for each state; marks follow it for hand-ins. */
export const CELL_GLYPH: Record<StudentItemState, string> = {
  done: '✓',
  late: 'L',
  reviewed: 'RV',
  missing: '—',
  excused: 'EXC',
  left: 'LEFT',
}

/** What each glyph means, for the legend under the matrix. */
export const CELL_MEANING: Record<StudentItemState, string> = {
  done: 'handed in',
  late: 'handed in late',
  reviewed: 'reviewed by you',
  missing: 'not handed in yet',
  excused: 'excused',
  left: 'left the class',
}

export function cellClassName(state: StudentItemState): string {
  return `ms-set-matrix__cell ms-set-matrix__cell--${state}`
}

function finite(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

/** A mark as a teacher writes it: 7, 7.5, never 7.499999. */
export function formatMark(n: number): string {
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/** "7/9", "7" (total unknown), or "" (not marked). */
export function formatMarks(earned: number | null | undefined, total: number | null | undefined): string {
  if (!finite(earned)) return ''
  return finite(total) && total > 0 ? `${formatMark(earned)}/${formatMark(total)}` : formatMark(earned)
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

export type MatrixColumn = {
  item_id: string
  /** Header text: "Q3", "9709/12", "Prompt 1". */
  label: string
  /** Second header line: "9709/12 · Jun 24", "Nov 24", "" for prompts. */
  sub: string
  total_marks: number | null
  /** Unabbreviated, for the header's accessible name and title. */
  title: string
}

const SEASON_SHORT: Array<[RegExp, string]> = [
  [/^may\/june$/i, 'Jun'],
  [/^october\/november$/i, 'Nov'],
  [/^february\/march$/i, 'Mar'],
]

/** "May/June 2024" → "Jun 24"; anything unrecognised is returned trimmed. */
export function shortSession(session: string | null | undefined): string {
  const s = (session ?? '').trim()
  const m = /^(.*\S)\s+(\d{4})$/.exec(s)
  if (!m) return s
  const season = SEASON_SHORT.find(([re]) => re.test(m[1]))?.[1]
  return season ? `${season} ${m[2].slice(2)}` : s
}

function marksPhrase(total: number | null): string {
  return finite(total) && total > 0 ? `, ${formatMark(total)} mark${total === 1 ? '' : 's'}` : ''
}

/** Matrix columns in item order. Prompts are numbered among themselves. */
export function matrixColumns(items: readonly AssignmentItem[]): MatrixColumn[] {
  let prompt = 0
  return [...items]
    .sort((a, b) => a.position - b.position)
    .map((item) => {
      const total = finite(item.total_marks) ? item.total_marks : null
      if (item.item_type === 'prompt') {
        prompt += 1
        return {
          item_id: item.id,
          label: `Prompt ${prompt}`,
          sub: '',
          total_marks: total,
          title: `Prompt ${prompt}${marksPhrase(total)}`,
        }
      }
      const paper = item.paper_code ?? 'Paper'
      const session = shortSession(item.paper_session)
      if (item.item_type === 'whole_paper') {
        return {
          item_id: item.id,
          label: paper,
          sub: session,
          total_marks: total,
          title: `Whole paper ${paper} ${item.paper_session ?? ''}`.trim() + marksPhrase(total),
        }
      }
      const qn = item.question_number?.trim() || '?'
      return {
        item_id: item.id,
        label: `Q${qn}`,
        sub: [paper, session].filter(Boolean).join(' · '),
        total_marks: total,
        title: `Question ${qn}, ${[paper, item.paper_session].filter(Boolean).join(' ')}${marksPhrase(total)}`,
      }
    })
}

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

export type MatrixCellInput = StudentAssignmentState['items'][number]

export type MatrixCell = {
  item_id: string
  state: StudentItemState
  /** Visible text: "✓ 7/9", "L 4/9", "RV 7/9", "—", "EXC", "LEFT". */
  text: string
  /** The sentence assistive tech reads, naming the student and the item. */
  label: string
  className: string
  /** The script in the review console, when one is behind a hand-in. */
  href: string | null
}

function stateSentence(state: StudentItemState, marks: string): string {
  const of = marks.includes('/') ? marks.replace('/', ' out of ') : marks
  switch (state) {
    case 'done':
      return marks ? `handed in, ${of} marks` : 'handed in, not marked yet'
    case 'late':
      return marks ? `handed in late, ${of} marks` : 'handed in late, not marked yet'
    case 'reviewed':
      return marks ? `reviewed by you, ${of} marks` : 'reviewed by you'
    case 'missing':
      return 'not handed in yet'
    case 'excused':
      return 'excused'
    case 'left':
      return 'left the class before handing this in'
  }
}

/** One cell as the matrix shows it. */
export function matrixCell(
  cell: MatrixCellInput,
  ctx: { studentName: string; column: Pick<MatrixColumn, 'title'> }
): MatrixCell {
  const handedIn = HANDED_IN_STATES.has(cell.state)
  const marks = handedIn ? formatMarks(cell.marks_earned, cell.total_marks) : ''
  const glyph = CELL_GLYPH[cell.state]
  const href = handedIn && cell.attempt_id ? reviewHref(cell.attempt_id) : null
  const sentence = stateSentence(cell.state, marks)
  return {
    item_id: cell.item_id,
    state: cell.state,
    text: marks ? `${glyph} ${marks}` : glyph,
    label: `${ctx.studentName}, ${ctx.column.title}: ${sentence}${href ? '. Open the script' : ''}`,
    className: cellClassName(cell.state),
    href,
  }
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export type RowStatus = 'complete' | 'partial' | 'none' | 'excused' | 'left'

export type MatrixRow = {
  student_id: string
  name: string
  membership: MembershipStatus
  status: RowStatus
  /** "78%", or "—" before anything is marked. */
  overall: string
  handed_in: number
  /** Chips beside the name: LEFT, EXC, EXT. */
  chips: Array<{ text: string; title: string; modifier: 'left' | 'draft' | 'due' }>
  /** The student's page; null for a student no longer in the class (their page is closed to you). */
  href: string | null
  late: boolean
  cells: MatrixCell[]
}

export function rowStatus(s: StudentAssignmentState): RowStatus {
  const handed = s.items.filter((i) => HANDED_IN_STATES.has(i.state)).length
  if (s.items.length > 0 && handed === s.items.length) return 'complete'
  if (s.membership !== 'active') return 'left'
  if (s.excused && handed === 0) return 'excused'
  return handed > 0 ? 'partial' : 'none'
}

export function matrixRow(
  s: StudentAssignmentState,
  columns: readonly MatrixColumn[],
  ctx: { classroomId: string }
): MatrixRow {
  const byItem = new Map(s.items.map((i) => [i.item_id, i]))
  const cells = columns.map((col) => {
    const cell: MatrixCellInput = byItem.get(col.item_id) ?? {
      item_id: col.item_id,
      state: s.membership !== 'active' ? 'left' : s.excused ? 'excused' : 'missing',
      marks_earned: null,
      total_marks: col.total_marks,
      attempt_id: null,
    }
    return matrixCell(cell, { studentName: s.display_name, column: col })
  })
  const chips: MatrixRow['chips'] = []
  if (s.membership !== 'active') {
    chips.push({
      text: 'LEFT',
      title: s.membership === 'removed' ? 'Removed from the class' : 'Left the class',
      modifier: 'left',
    })
  }
  if (s.excused) chips.push({ text: 'EXC', title: 'Excused from this set', modifier: 'draft' })
  if (s.extended_due_at) chips.push({ text: 'EXT', title: 'Has an extension', modifier: 'due' })
  return {
    student_id: s.student_id,
    name: s.display_name,
    membership: s.membership,
    status: rowStatus(s),
    overall: finite(s.overall_pct) ? `${Math.round(s.overall_pct)}%` : NO_DATA,
    handed_in: s.items.filter((i) => HANDED_IN_STATES.has(i.state)).length,
    chips,
    href: s.membership === 'active' ? studentHref(ctx.classroomId, s.student_id) : null,
    late: s.is_late,
    cells,
  }
}

export type Matrix = {
  columns: MatrixColumn[]
  rows: MatrixRow[]
  /** Class mean per column ("64%" or "—"), in column order. */
  means: string[]
  /** "64%" or "—". */
  classMean: string
  /** Students with at least one item handed in. */
  anyHandedIn: number
}

/**
 * The whole matrix for a set. Rows keep progress order (by name) with the
 * students still in the class first, so the ones a teacher can act on are
 * never below a block of LEFT rows.
 */
export function buildMatrix(
  progress: Pick<AssignmentProgress, 'students' | 'per_item' | 'class_mean_pct'>,
  items: readonly AssignmentItem[],
  ctx: { classroomId: string }
): Matrix {
  const columns = matrixColumns(items)
  const active = progress.students.filter((s) => s.membership === 'active')
  const gone = progress.students.filter((s) => s.membership !== 'active')
  const rows = [...active, ...gone].map((s) => matrixRow(s, columns, ctx))
  const meanByItem = new Map(progress.per_item.map((p) => [p.item_id, p]))
  return {
    columns,
    rows,
    means: columns.map((c) => {
      const p = meanByItem.get(c.item_id)
      return p && p.n > 0 && finite(p.mean_pct) ? `${Math.round(p.mean_pct)}%` : NO_DATA
    }),
    classMean: finite(progress.class_mean_pct) ? `${Math.round(progress.class_mean_pct)}%` : NO_DATA,
    anyHandedIn: rows.filter((r) => r.handed_in > 0).length,
  }
}
