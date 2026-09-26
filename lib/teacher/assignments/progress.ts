/**
 * One set's progress: who it is for, what each of them has handed in, and the
 * class summary the completion matrix, the late list and the remind button
 * read (docs/TEACHER_SYSTEM_SPEC.md §2.1 AssignmentProgress, §4 set page).
 *
 * The rules are not re-derived here. Who a set is for is setRoster (the week
 * view's rule: targeted students — active members, plus anyone who handed in
 * or left after it was published, shown as LEFT); each student's cells and
 * the counts are deriveStudentState / summariseProgress (P0). So the set page,
 * the week strip and the desk can never disagree about who is late.
 *
 * Names are displayName() ("Amira K."), as everywhere a set's states go:
 * the same objects feed the digest and Omni, where full names may not.
 *
 * Pure: no I/O.
 */

import { HANDED_IN_STATES, deriveStudentState, summariseProgress } from '@/lib/teacher/assignment-status'
import { buildCohortGapReport, type GapAttempt, type MissedPoint } from '@/lib/teacher/cohort-gaps'
import { displayName } from '@/lib/teacher/display-name'
import type {
  Assignment,
  AssignmentItem,
  AssignmentProgress,
  AssignmentStudentFlags,
  AssignmentSubmission,
  StudentAssignmentState,
} from '@/lib/teacher/types'
import type { ClassroomMember } from '@/lib/teacher-analytics'
import { setRoster } from '@/lib/teacher/week'

export type ProgressInput = {
  assignment: Pick<Assignment, 'id' | 'target' | 'published_at' | 'due_at'>
  items: readonly AssignmentItem[]
  /** Every membership of the classroom, whatever its status. */
  members: readonly ClassroomMember[]
  /** assignment_students rows: targeting, excuses, extensions, notes. */
  flags: readonly AssignmentStudentFlags[]
  submissions: readonly AssignmentSubmission[]
  /** student id → full name (teacher_roster_profiles); displayName() is applied here. */
  names: ReadonlyMap<string, string | null>
}

/** Matrix order: by name, then id, so two "Amira K."s keep a stable order. */
function byName(a: StudentAssignmentState, b: StudentAssignmentState): number {
  return a.display_name.localeCompare(b.display_name) || a.student_id.localeCompare(b.student_id)
}

/** The set's AssignmentProgress (spec §2.1). */
export function buildAssignmentProgress(input: ProgressInput): AssignmentProgress {
  const items = [...input.items].sort((a, b) => a.position - b.position)
  const flags = [...input.flags]
  const submissions = [...input.submissions]
  const roster = setRoster(
    { target: input.assignment.target, published_at: input.assignment.published_at, flags, submissions },
    input.members
  )

  const students: StudentAssignmentState[] = roster
    .map((m) => ({
      student_id: m.student_id,
      display_name: displayName(input.names.get(m.student_id) ?? null),
      ...deriveStudentState({
        membership: m.status,
        items,
        submissions: submissions.filter((s) => s.student_id === m.student_id),
        flags: flags.find((f) => f.student_id === m.student_id) ?? null,
        due_at: input.assignment.due_at,
      }),
    }))
    .sort(byName)

  return { assignment_id: input.assignment.id, ...summariseProgress(students, items), students }
}

/** Whether a student still owes work: active, not excused, some item not handed in. */
export function owesWork(state: StudentAssignmentState): boolean {
  if (state.membership !== 'active' || state.excused) return false
  return state.items.length > 0 && state.items.some((i) => !HANDED_IN_STATES.has(i.state))
}

/**
 * Who a reminder goes to: students who still owe work, limited to `requested`
 * when the teacher picked some. Returns `unknown` for requested ids that are
 * not on the set's roster, so the route can refuse them rather than silently
 * drop a student the teacher meant to nudge.
 */
export function studentsToRemind(
  progress: Pick<AssignmentProgress, 'students'>,
  requested: readonly string[] | null
): { ids: string[]; unknown: string[] } {
  const owing = new Set(progress.students.filter(owesWork).map((s) => s.student_id))
  if (!requested) return { ids: [...owing].sort(), unknown: [] }
  const roster = new Set(progress.students.map((s) => s.student_id))
  const unknown = requested.filter((id) => !roster.has(id))
  return { ids: requested.filter((id) => owing.has(id)).sort(), unknown }
}

/** Remind is limited to once per set per this long (spec §3). */
export const REMIND_COOLDOWN_MS = 6 * 60 * 60_000

/**
 * Milliseconds until the set may be reminded again, 0 when it may now.
 * `lastRemindedAt` is the latest assignment_students.reminded_at on the set.
 * A timestamp in the future (clock skew) counts as "just now".
 */
export function remindRetryAfterMs(lastRemindedAt: string | null, now: Date): number {
  if (!lastRemindedAt) return 0
  const last = Date.parse(lastRemindedAt)
  if (!Number.isFinite(last)) return 0
  const since = Math.max(0, now.getTime() - last)
  return since >= REMIND_COOLDOWN_MS ? 0 : REMIND_COOLDOWN_MS - since
}

// ---------------------------------------------------------------------------
// Item gaps (T/assignments/[aid]/gaps)
// ---------------------------------------------------------------------------

export type ItemGap = {
  item_id: string
  /** Scripts with per-mark detail behind this item's notes. */
  scripts: number
  /** Mean percentage of the hand-ins, as progress.per_item reports it. */
  mean_pct: number | null
  /** Hand-ins counted in mean_pct. */
  n: number
  /** The three misses most students on this item shared. */
  most_missed: MissedPoint[]
  /** Attempts behind the item's hand-ins, for "Open N scripts". */
  attempt_ids: string[]
}

export const ITEM_TOP_MISSED = 3

/**
 * Per-item gap rows for the set page's ItemGapList: the class mean on each
 * item (from progress, so it matches the matrix) and the notes most students
 * dropped marks on, from the hand-in attempts' marking.
 */
export function buildItemGaps(
  items: readonly AssignmentItem[],
  progress: Pick<AssignmentProgress, 'per_item' | 'students'>,
  attemptsById: ReadonlyMap<string, GapAttempt>
): ItemGap[] {
  return [...items]
    .sort((a, b) => a.position - b.position)
    .map((item) => {
      const summary = progress.per_item.find((p) => p.item_id === item.id)
      const attemptIds: string[] = []
      const scripts: GapAttempt[] = []
      for (const s of progress.students) {
        const cell = s.items.find((c) => c.item_id === item.id)
        if (!cell?.attempt_id || !HANDED_IN_STATES.has(cell.state)) continue
        attemptIds.push(cell.attempt_id)
        const attempt = attemptsById.get(cell.attempt_id)
        if (attempt) scripts.push(attempt)
      }
      const report = buildCohortGapReport(scripts, { topMissed: ITEM_TOP_MISSED })
      return {
        item_id: item.id,
        scripts: report.scripts,
        mean_pct: summary?.mean_pct ?? null,
        n: summary?.n ?? 0,
        most_missed: report.mostMissed.slice(0, ITEM_TOP_MISSED),
        attempt_ids: attemptIds,
      }
    })
}
