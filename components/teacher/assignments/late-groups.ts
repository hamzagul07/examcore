/**
 * Who the set page's LateList shows, and in which group
 * (docs/TEACHER_SYSTEM_SPEC.md §4 `.../assignments/[aid]`: "LateList with
 * Excuse/Extend Sheet").
 *
 * The list is for acting on students, so it holds only students still in the
 * class, grouped by what the teacher is likely to do:
 *
 *   overdue   past their own deadline with work still owed — chase, excuse
 *             or extend. A part-way student with a late hand-in is here too:
 *             what they still owe matters more than what arrived late.
 *   late      handed everything in, some of it after the deadline — an
 *             extension clears the late mark (lateness is judged against the
 *             later of the set's due date and the extension).
 *   owing     still to hand in, deadline not reached (or no deadline).
 *   excused   excused and not done — listed so an excuse can be withdrawn.
 *
 * Deadlines use effectiveDueAt (P0), so "overdue" here and "late" on the
 * matrix can never disagree. Pure.
 */

import { HANDED_IN_STATES, effectiveDueAt } from '@/lib/teacher/assignment-status'
import type { StudentAssignmentState } from '@/lib/teacher/types'

export type LateGroup = 'overdue' | 'late' | 'owing' | 'excused'

export type LateRow = {
  student_id: string
  name: string
  group: LateGroup
  handed_in: number
  items: number
  /** The deadline this student is held to (set due date or their extension). */
  deadline: string | null
  extended_due_at: string | null
  excused: boolean
  feedback: string | null
}

export type LateGroups = Record<LateGroup, LateRow[]>

export const LATE_GROUP_ORDER: readonly LateGroup[] = ['overdue', 'late', 'owing', 'excused']

export const LATE_GROUP_TITLE: Record<LateGroup, string> = {
  overdue: 'Past the deadline',
  late: 'Handed in late',
  owing: 'Still to hand in',
  excused: 'Excused',
}

export function lateGroups(
  students: readonly StudentAssignmentState[],
  dueAt: string | null,
  now: Date
): LateGroups {
  const out: LateGroups = { overdue: [], late: [], owing: [], excused: [] }
  const nowMs = now.getTime()
  for (const s of students) {
    if (s.membership !== 'active') continue
    const handed = s.items.filter((i) => HANDED_IN_STATES.has(i.state)).length
    const complete = s.items.length > 0 && handed === s.items.length
    const deadline = effectiveDueAt(dueAt, s.extended_due_at)
    const passed = deadline !== null && Date.parse(deadline) < nowMs
    let group: LateGroup | null = null
    if (complete) group = s.is_late ? 'late' : null
    else if (s.excused) group = 'excused'
    else group = passed ? 'overdue' : 'owing'
    if (!group) continue
    out[group].push({
      student_id: s.student_id,
      name: s.display_name,
      group,
      handed_in: handed,
      items: s.items.length,
      deadline,
      extended_due_at: s.extended_due_at,
      excused: s.excused,
      feedback: s.feedback,
    })
  }
  for (const g of LATE_GROUP_ORDER) {
    out[g].sort((a, b) => a.name.localeCompare(b.name) || a.student_id.localeCompare(b.student_id))
  }
  return out
}

/** "2 of 4 handed in", "Nothing handed in", "All 4 handed in". */
export function handedInPhrase(row: Pick<LateRow, 'handed_in' | 'items'>): string {
  if (row.items === 0) return 'Nothing to hand in'
  if (row.handed_in === 0) return 'Nothing handed in'
  if (row.handed_in >= row.items) return row.items === 1 ? 'Handed in' : `All ${row.items} handed in`
  return `${row.handed_in} of ${row.items} handed in`
}

/**
 * The earliest deadline an extension may be set to, and the base the quick
 * chips count from: the later of the set's due date and the extension the
 * student already has. Null when the set has no due date (nothing to extend).
 */
export function extensionBase(dueAt: string | null, extendedDueAt: string | null): string | null {
  if (!dueAt || !Number.isFinite(Date.parse(dueAt))) return null
  return effectiveDueAt(dueAt, extendedDueAt)
}

/** Whether `candidate` is a usable extension: a real instant strictly after the set's due date. */
export function isValidExtension(candidate: string | null, dueAt: string | null): boolean {
  if (!candidate || !dueAt) return false
  const c = Date.parse(candidate)
  const d = Date.parse(dueAt)
  return Number.isFinite(c) && Number.isFinite(d) && c > d
}
