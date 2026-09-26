/**
 * One student's record on a class's sets, and a roster's "latest set" column
 * (docs/TEACHER_SYSTEM_SPEC.md §4: `.../students` roster rows show the latest
 * set; `.../students/[studentId]` has StudentAssignmentRecord).
 *
 * States come from the shared rules only: who a set is for is `setRoster`
 * (lib/teacher/week.ts) and each item's state is `deriveStudentState`
 * (lib/teacher/assignment-status.ts), so this page, the completion matrix,
 * the week strip and the desk can never disagree about whether a student
 * handed something in. What this module adds is the one-word outcome a row
 * leads with, and one rule the matrix does not need: a set whose deadline
 * passed before the student joined was never theirs to hand in, so it reads
 * "before joining", not "missing".
 *
 * Pure (no I/O, no clock except the `now` passed in). Server-side in
 * practice: setRoster lives beside the class-week loader.
 */

import {
  HANDED_IN_STATES,
  assignmentStatus,
  deriveStudentState,
  effectiveDueAt,
} from '@/lib/teacher/assignment-status'
import type { ClassroomMember } from '@/lib/teacher-analytics'
import type {
  Assignment,
  AssignmentItem,
  AssignmentStudentFlags,
  AssignmentSubmission,
  StudentAssignmentState,
  StudentItemState,
} from '@/lib/teacher/types'
import { setRoster } from '@/lib/teacher/week'
import { formatMark } from '@/lib/teacher/insights/format'

/** A published set with what one student's (or the class's) record on it is derived from. */
export type RecordSet = Pick<
  Assignment,
  'id' | 'classroom_id' | 'title' | 'kind' | 'is_mock' | 'target' | 'due_at' | 'published_at' | 'closed_at' | 'archived_at'
> & {
  items: AssignmentItem[]
  flags: AssignmentStudentFlags[]
  submissions: AssignmentSubmission[]
}

/**
 * The row's one-word outcome:
 *   complete / late  every item handed in (late if any hand-in was late)
 *   partial          some handed in, not all
 *   to_do            nothing yet, and the deadline has not passed
 *   missing          nothing, and the deadline has passed (or the set closed)
 *   excused          excused, and not every item handed in
 *   before_joining   nothing handed in, and the deadline passed before they joined
 *   left             no longer in the class, and not every item handed in
 */
export type RecordOutcome = 'complete' | 'late' | 'partial' | 'to_do' | 'missing' | 'excused' | 'before_joining' | 'left'

export const OUTCOME_LABEL: Record<RecordOutcome, string> = {
  complete: 'Handed in',
  late: 'Handed in late',
  partial: 'Part done',
  to_do: 'To do',
  missing: 'Missing',
  excused: 'Excused',
  before_joining: 'Before joining',
  left: 'Left',
}

/** The completion-matrix cell style an outcome is drawn with (`.ms-set-matrix__cell--*`). */
export const OUTCOME_CELL: Record<RecordOutcome, StudentItemState> = {
  complete: 'done',
  late: 'late',
  partial: 'missing',
  to_do: 'missing',
  missing: 'missing',
  excused: 'excused',
  before_joining: 'excused',
  left: 'left',
}

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

/** The outcome of one derived state (see RecordOutcome). */
export function recordOutcome(
  state: Omit<StudentAssignmentState, 'student_id' | 'display_name'>,
  set: Pick<RecordSet, 'due_at' | 'published_at' | 'closed_at' | 'archived_at'>,
  joinedAt: string | null,
  now: Date
): RecordOutcome {
  const total = state.items.length
  const handed = state.items.filter((i) => HANDED_IN_STATES.has(i.state)).length
  // Same precedence as summariseProgress: work handed in outranks every flag,
  // then left, then excused.
  if (total > 0 && handed === total) return state.is_late ? 'late' : 'complete'
  if (state.membership !== 'active') return 'left'
  if (state.excused) return 'excused'
  if (handed > 0) return 'partial'

  const deadline = toMs(effectiveDueAt(set.due_at, state.extended_due_at))
  const joined = toMs(joinedAt)
  if (deadline !== null && joined !== null && joined >= deadline) return 'before_joining'
  const overdue = deadline !== null ? deadline < now.getTime() : assignmentStatus(set, now) === 'closed'
  return overdue ? 'missing' : 'to_do'
}

export type StudentSetRecordRow = {
  id: string
  classroom_id: string
  title: string
  kind: Assignment['kind']
  is_mock: boolean
  status: 'open' | 'closed'
  /** The student's own deadline: the later of the set's due date and their extension. */
  due_at: string | null
  extended: boolean
  published_at: string | null
  items: AssignmentItem[]
  cells: StudentAssignmentState['items']
  handed_in: number
  overall_pct: number | null
  outcome: RecordOutcome
}

function sortKey(s: Pick<RecordSet, 'due_at' | 'published_at'>): number {
  return toMs(s.due_at) ?? toMs(s.published_at) ?? 0
}

/**
 * The student's row on every published set that is for them, newest first
 * (by deadline, else publication). `sets` carry this student's flags and
 * hand-ins (the class's are fine too — they are filtered here).
 */
export function buildStudentSetRecord(
  sets: readonly RecordSet[],
  member: ClassroomMember,
  now: Date = new Date()
): StudentSetRecordRow[] {
  const rows: StudentSetRecordRow[] = []
  for (const set of sets) {
    if (!set.published_at) continue
    const flags = set.flags.filter((f) => f.student_id === member.student_id)
    const submissions = set.submissions.filter((s) => s.student_id === member.student_id)
    if (setRoster({ target: set.target, published_at: set.published_at, flags, submissions }, [member]).length === 0) continue
    const state = deriveStudentState({
      membership: member.status,
      items: set.items,
      submissions,
      flags: flags[0] ?? null,
      due_at: set.due_at,
    })
    const status = assignmentStatus(set, now)
    rows.push({
      id: set.id,
      classroom_id: set.classroom_id,
      title: set.title,
      kind: set.kind,
      is_mock: set.is_mock,
      status: status === 'open' ? 'open' : 'closed',
      due_at: effectiveDueAt(set.due_at, state.extended_due_at),
      extended: Boolean(state.extended_due_at) && effectiveDueAt(set.due_at, state.extended_due_at) !== set.due_at,
      published_at: set.published_at,
      items: [...set.items].sort((a, b) => a.position - b.position),
      cells: state.items,
      handed_in: state.items.filter((i) => HANDED_IN_STATES.has(i.state)).length,
      overall_pct: state.overall_pct,
      outcome: recordOutcome(state, set, member.joined_at, now),
    })
  }
  return rows.sort(
    (a, b) => sortKey(b) - sortKey(a) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id)
  )
}

export type StudentRecordSummary = {
  sets: number
  handedIn: number
  late: number
  missing: number
  open: number
}

/** Counts for the student's head: sets for them, handed in, late, missing, still open. */
export function summariseStudentRecord(rows: readonly StudentSetRecordRow[]): StudentRecordSummary {
  const out: StudentRecordSummary = { sets: 0, handedIn: 0, late: 0, missing: 0, open: 0 }
  for (const r of rows) {
    if (r.outcome === 'before_joining') continue
    out.sets += 1
    if (r.outcome === 'complete' || r.outcome === 'late') out.handedIn += 1
    if (r.outcome === 'late') out.late += 1
    if (r.outcome === 'missing') out.missing += 1
    if (r.status === 'open' && (r.outcome === 'to_do' || r.outcome === 'partial')) out.open += 1
  }
  return out
}

// ---------------------------------------------------------------------------
// The roster's "latest set" column
// ---------------------------------------------------------------------------

/** The class's most recently published set, or null. Ties go to the later id. */
export function pickLatestSet<T extends Pick<RecordSet, 'id' | 'published_at' | 'archived_at'>>(sets: readonly T[]): T | null {
  let best: { set: T; ms: number } | null = null
  for (const s of sets) {
    if (s.archived_at) continue
    const ms = toMs(s.published_at)
    if (ms === null) continue
    if (!best || ms > best.ms || (ms === best.ms && s.id > best.set.id)) best = { set: s, ms }
  }
  return best?.set ?? null
}

export type RosterSetCell = {
  outcome: RecordOutcome
  /** "7/9", "2 of 3 in", or '' — the figure beside the outcome. */
  detail: string
  overall_pct: number | null
}

/**
 * Each member's cell for one set, keyed by student id. Members the set is
 * not for (a targeted set, a student who joined after it) are absent.
 */
export function latestSetByStudent(
  set: RecordSet,
  members: readonly ClassroomMember[],
  now: Date = new Date()
): Map<string, RosterSetCell> {
  const out = new Map<string, RosterSetCell>()
  for (const m of setRoster(set, members)) {
    const submissions = set.submissions.filter((s) => s.student_id === m.student_id)
    const flags = set.flags.find((f) => f.student_id === m.student_id) ?? null
    const state = deriveStudentState({ membership: m.status, items: set.items, submissions, flags, due_at: set.due_at })
    const outcome = recordOutcome(state, set, m.joined_at, now)
    const handed = state.items.filter((i) => HANDED_IN_STATES.has(i.state))
    let detail = ''
    if (outcome === 'complete' || outcome === 'late') {
      let earned = 0
      let total = 0
      let known = true
      for (const i of handed) {
        if (typeof i.marks_earned !== 'number' || typeof i.total_marks !== 'number' || !(i.total_marks > 0)) {
          known = false
          break
        }
        earned += i.marks_earned
        total += i.total_marks
      }
      detail = known && total > 0 ? `${formatMark(earned)}/${formatMark(total)}` : ''
    } else if (outcome === 'partial') {
      detail = `${handed.length} of ${state.items.length} in`
    }
    out.set(m.student_id, { outcome, detail, overall_pct: state.overall_pct })
  }
  return out
}
