/**
 * How a set, and each student's work on it, is classified
 * (docs/TEACHER_SYSTEM_SPEC.md §2.2).
 *
 * Every surface that says "late", "missing" or "closed" — the completion
 * matrix, the week strip, the student's own list, the digest, the reminder
 * cron — reads it from here, so a teacher never sees a student counted late
 * on one page and on time on another. Pure: no clock except the optional
 * `now`, no I/O, safe for client and server.
 *
 * Rules, in one place:
 *
 *   - Lateness is judged at the FIRST hand-in of an item, against the later of
 *     the set's due date and the student's own extension. An extension only
 *     ever extends; a teacher who types an earlier date by mistake must not
 *     turn work that was on time into late work. Handing in exactly at the
 *     deadline is on time. A set with no due date has no deadline, extension
 *     or not.
 *   - A set closes for the class at effectiveCloseAt, but for a student with
 *     an extension only once their extended deadline has also passed
 *     (studentCloseAt / studentAssignmentStatus).
 *   - Lateness is derived from timestamps, not from the stored submission
 *     status, so granting an extension after the fact clears the late mark
 *     without rewriting any rows. The stored status matters only for
 *     'reviewed' (a teacher confirmed or re-marked it).
 *   - Work handed in outranks every flag: a student who left keeps the marks
 *     they earned while a member, and an excused student who did it anyway is
 *     shown as having done it.
 *   - A set with no items has nothing to hand in, so nobody has handed it in.
 */

import type {
  Assignment,
  AssignmentItem,
  AssignmentProgress,
  AssignmentStudentFlags,
  AssignmentSubmission,
  MembershipStatus,
  StudentAssignmentState,
  StudentItemState,
} from '@/lib/teacher/types'

/**
 * A published set stops being "open" this many days after its due date, even
 * if the teacher never presses Close. Without it a teacher who never closes
 * anything would have every set they ever made on the Open tab and in their
 * students' "to do" list, and there would be no "last closed set" for the
 * reteach card to read. Late hand-ins after that are still accepted when the
 * set allows them (settings.allow_late, default true).
 */
export const AUTO_CLOSE_AFTER_DUE_DAYS = 7

const DAY_MS = 86_400_000

/** Item states that mean "the student handed this in". */
export const HANDED_IN_STATES: ReadonlySet<StudentItemState> = new Set<StudentItemState>([
  'done',
  'late',
  'reviewed',
])

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

/** Percentage to one decimal place; the display layer rounds further. */
function roundPct(value: number): number {
  return Math.round(value * 10) / 10
}

function isUsableMark(earned: number | null, total: number | null): total is number {
  return (
    earned !== null &&
    total !== null &&
    Number.isFinite(earned) &&
    Number.isFinite(total) &&
    total > 0
  )
}

/**
 * The deadline a student is actually held to: the later of the set's due date
 * and their extension, or null when the set has no usable due date.
 *
 * An extension only ever extends the set's deadline, so on a set with no due
 * date it is ignored. Otherwise a teacher who cleared the due date after
 * giving one student extra time would leave that student — and only that
 * student — with a deadline: late after their "extension", shown overdue, and
 * chased by the reminder cron.
 */
export function effectiveDueAt(dueAt: string | null, extendedDueAt: string | null): string | null {
  const due = toMs(dueAt)
  if (due === null) return null
  const extended = toMs(extendedDueAt)
  return new Date(Math.max(due, extended ?? -Infinity)).toISOString()
}

/**
 * Whether work handed in at `submittedAt` was late. False when there is no
 * deadline, and false when the hand-in time cannot be read (lateness has to be
 * shown, not assumed).
 */
export function isLate(submittedAt: string, dueAt: string | null, extendedDueAt: string | null): boolean {
  const deadline = toMs(effectiveDueAt(dueAt, extendedDueAt))
  if (deadline === null) return false
  const submitted = toMs(submittedAt)
  if (submitted === null) return false
  return submitted > deadline
}

/**
 * One student's state on one set, before their name is attached.
 *
 * `submissions` are this student's rows for this set; rows for items not in
 * `items` are ignored. Items come back in `position` order so matrix columns
 * line up across students.
 */
export function deriveStudentState(input: {
  membership: MembershipStatus
  items: AssignmentItem[]
  submissions: AssignmentSubmission[]
  flags: AssignmentStudentFlags | null
  due_at: string | null
}): Omit<StudentAssignmentState, 'student_id' | 'display_name'> {
  const { membership, submissions, flags, due_at } = input
  const items = [...input.items].sort((a, b) => a.position - b.position)
  const extendedDueAt = flags?.extended_due_at ?? null
  const excused = Boolean(flags?.excused_at)

  // (item_id, student_id) is unique in the table; if a caller hands over
  // duplicates anyway, the better mark is the one that counts.
  const byItem = new Map<string, AssignmentSubmission>()
  for (const s of submissions) {
    const held = byItem.get(s.item_id)
    if (!held || (s.marks_earned ?? -Infinity) > (held.marks_earned ?? -Infinity)) {
      byItem.set(s.item_id, s)
    }
  }

  let earnedSum = 0
  let totalSum = 0
  let marked = 0
  let anyLate = false

  const itemStates = items.map((item) => {
    const sub = byItem.get(item.id)
    if (!sub) {
      const state: StudentItemState =
        membership !== 'active' ? 'left' : excused ? 'excused' : 'missing'
      return {
        item_id: item.id,
        state,
        marks_earned: null,
        total_marks: item.total_marks,
        attempt_id: null,
      }
    }

    const late = isLate(sub.first_submitted_at, due_at, extendedDueAt)
    if (late) anyLate = true
    const state: StudentItemState = sub.status === 'reviewed' ? 'reviewed' : late ? 'late' : 'done'
    const total = sub.total_marks ?? item.total_marks
    if (isUsableMark(sub.marks_earned, total)) {
      earnedSum += sub.marks_earned as number
      totalSum += total
      marked += 1
    }
    return {
      item_id: item.id,
      state,
      marks_earned: sub.marks_earned,
      total_marks: total,
      attempt_id: sub.attempt_id,
    }
  })

  return {
    membership,
    items: itemStates,
    // Over the work handed in, not over the whole set: a student who did two
    // of five questions well is not a 40% student, and completion is shown by
    // the cells beside it.
    overall_pct: marked > 0 ? roundPct((earnedSum / totalSum) * 100) : null,
    is_late: anyLate,
    excused,
    extended_due_at: extendedDueAt,
    feedback: flags?.feedback ?? null,
  }
}

/**
 * Class-level counts for one set.
 *
 * Every student lands in exactly one of handed_in / left / excused / missing
 * (checked in that order), so those four always sum to total_students.
 * handed_in means every item handed in; a student part-way through is still
 * missing. `late` is an overlay, not a fifth bucket: students with at least
 * one late hand-in.
 */
export function summariseProgress(
  states: StudentAssignmentState[],
  items: AssignmentItem[]
): Omit<AssignmentProgress, 'assignment_id' | 'students'> {
  let handedIn = 0
  let left = 0
  let excused = 0
  let missing = 0
  let late = 0
  let pctSum = 0
  let pctCount = 0

  for (const s of states) {
    const complete = s.items.length > 0 && s.items.every((i) => HANDED_IN_STATES.has(i.state))
    if (complete) handedIn += 1
    else if (s.membership !== 'active') left += 1
    else if (s.excused) excused += 1
    else missing += 1

    if (s.is_late) late += 1
    if (s.overall_pct !== null && Number.isFinite(s.overall_pct)) {
      pctSum += s.overall_pct
      pctCount += 1
    }
  }

  const perItem = [...items]
    .sort((a, b) => a.position - b.position)
    .map((item) => {
      let sum = 0
      let n = 0
      for (const s of states) {
        const cell = s.items.find((i) => i.item_id === item.id)
        if (!cell || !HANDED_IN_STATES.has(cell.state)) continue
        if (!isUsableMark(cell.marks_earned, cell.total_marks)) continue
        sum += ((cell.marks_earned as number) / cell.total_marks) * 100
        n += 1
      }
      return { item_id: item.id, mean_pct: n > 0 ? roundPct(sum / n) : null, n }
    })

  return {
    total_students: states.length,
    handed_in: handedIn,
    late,
    excused,
    missing,
    left,
    // Mean of the students' own percentages, so one student with a long
    // paper does not outweigh the class.
    class_mean_pct: pctCount > 0 ? roundPct(pctSum / pctCount) : null,
    per_item: perItem,
  }
}

type StatusFields = Pick<Assignment, 'published_at' | 'closed_at' | 'archived_at' | 'due_at'>

/**
 * When a published set stops being open: the earlier of the teacher's
 * closed_at and AUTO_CLOSE_AFTER_DUE_DAYS after due_at. Null when it has
 * neither. Exported so list queries can filter on the same instant.
 */
export function effectiveCloseAt(a: Pick<Assignment, 'closed_at' | 'due_at'>): string | null {
  const closed = toMs(a.closed_at)
  const due = toMs(a.due_at)
  const autoClose = due === null ? null : due + AUTO_CLOSE_AFTER_DUE_DAYS * DAY_MS
  if (closed === null && autoClose === null) return null
  return new Date(Math.min(closed ?? Infinity, autoClose ?? Infinity)).toISOString()
}

/**
 * When a published set stops being open for ONE student: the set's effective
 * close, or their extended deadline when that is later. Null when the set
 * never closes.
 *
 * An extension is a promise that the student may still hand the work in, so
 * neither the auto-close nor the teacher pressing Close takes it back: the
 * set stays open for that student until their own deadline. After it, the
 * set is closed for them as for everyone else (and late work is accepted or
 * not by settings.allow_late, as for everyone else). An extension on a set
 * with no due date is ignored (see effectiveDueAt).
 */
export function studentCloseAt(
  a: Pick<Assignment, 'closed_at' | 'due_at'>,
  extendedDueAt: string | null
): string | null {
  const close = toMs(effectiveCloseAt(a))
  if (close === null) return null
  // Only a real extension (past the set's due date) can move the close; the
  // due date itself never reopens a set the teacher closed early.
  const due = toMs(a.due_at)
  const extended = toMs(extendedDueAt)
  if (due === null || extended === null || extended <= due) return new Date(close).toISOString()
  return new Date(Math.max(close, extended)).toISOString()
}

function nowMsOf(now: Date): number {
  return Number.isFinite(now.getTime()) ? now.getTime() : Date.now()
}

/**
 * draft: never published. closed: archived, or past its effective close
 * (see effectiveCloseAt). open: everything else — including a set past its
 * due date but inside the grace window, which is where "late" lives.
 *
 * This is the set's status for the class as a whole (its tab, the week strip,
 * the teacher's open-set counts). Whether one student can still hand work in
 * is studentAssignmentStatus, which honours their extension.
 */
export function assignmentStatus(a: StatusFields, now: Date = new Date()): 'draft' | 'open' | 'closed' {
  if (!a.published_at) return 'draft'
  if (a.archived_at) return 'closed'
  const closeAt = toMs(effectiveCloseAt(a))
  if (closeAt !== null && closeAt <= nowMsOf(now)) return 'closed'
  return 'open'
}

/**
 * assignmentStatus for one student: the same, except that the set closes for
 * them at studentCloseAt — so a student with an extension past the set's
 * close still sees it open, can still hand in, and is still reminded, until
 * their own deadline. Every student-facing rule (the marking gate, the
 * student's list, reconciliation's window, reminders) uses this one.
 */
export function studentAssignmentStatus(
  a: StatusFields,
  extendedDueAt: string | null,
  now: Date = new Date()
): 'draft' | 'open' | 'closed' {
  if (!a.published_at) return 'draft'
  if (a.archived_at) return 'closed'
  const closeAt = toMs(studentCloseAt(a, extendedDueAt))
  if (closeAt !== null && closeAt <= nowMsOf(now)) return 'closed'
  return 'open'
}
