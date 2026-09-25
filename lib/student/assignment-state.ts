/**
 * A student's own view of the work their teachers set
 * (docs/TEACHER_SYSTEM_SPEC.md §3 `/api/assignments`, §4 student surfaces).
 *
 * The teacher's completion matrix and the student's "to do" list must never
 * disagree about whether something is late, missing or closed, so every rule
 * here is built on lib/teacher/assignment-status.ts (deriveStudentState,
 * effectiveDueAt, assignmentStatus) rather than restating it. What this module
 * adds is the student's framing of the same facts:
 *
 *   - which list a set belongs on (open = still to do, done = nothing more is
 *     expected), and in what order;
 *   - whether the student can still hand work in (mirrors
 *     validateAssignmentItemForStudent, the gate /api/mark/process applies);
 *   - how a teacher's re-mark reads on the attempt page;
 *   - the class average, which only ever leaves the server as one aggregate,
 *     only when the class allows it, and only over enough students that no
 *     classmate's mark can be worked back out of it.
 *
 * Pure and client-safe: no I/O and no clock except the `now` passed in.
 */

import { HANDED_IN_STATES, assignmentStatus, deriveStudentState, effectiveDueAt } from '@/lib/teacher/assignment-status'
import { assignmentReturnPath, studentMarkHref } from '@/lib/teacher/assignments/link'
import { itemReference } from '@/lib/teacher/assignments/print-model'
import type {
  Assignment,
  AssignmentItem,
  AssignmentKind,
  AssignmentStudentFlags,
  AssignmentSubmission,
  ClassroomSettings,
  ReviewDecision,
  StudentItemState,
} from '@/lib/teacher/types'

// ---------------------------------------------------------------------------
// Copy shared by the join page, the set page and the account page
// ---------------------------------------------------------------------------

/** The notice on every set page (spec §4). */
export const SET_VISIBILITY_NOTE = 'Marks on this set are visible to your teacher.'

/** Said the same way on the join page and beside the Leave button (lib/student/join.ts). */
export { CLASS_RETENTION_NOTE } from '@/lib/student/join'

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** The set columns a student's list needs (all readable under assignment_student_read). */
export type StudentSetRow = Pick<
  Assignment,
  'id' | 'classroom_id' | 'title' | 'kind' | 'is_mock' | 'due_at' | 'published_at' | 'closed_at' | 'archived_at' | 'settings'
>

/** The student's own row in assignment_students, as far as they are shown it. */
export type StudentFlags = Pick<AssignmentStudentFlags, 'excused_at' | 'extended_due_at' | 'feedback' | 'feedback_at'>

/**
 * Where a set stands for this student.
 *
 *   not_started  open, nothing handed in yet, deadline not passed
 *   in_progress  open, some items handed in, deadline not passed
 *   overdue      open (inside the late window), deadline passed, not all handed in
 *   complete     every item handed in (`is_late` says whether any was late)
 *   excused      the teacher excused them and not every item is in
 *   missed       the set has closed and not every item is in
 */
export type StudentSetState = 'not_started' | 'in_progress' | 'overdue' | 'complete' | 'excused' | 'missed'

/** One set on the student's list (`GET /api/assignments`). */
export type StudentAssignment = {
  id: string
  href: string
  title: string
  kind: AssignmentKind
  is_mock: boolean
  classroom: { id: string; name: string }
  /** The set's own due date. */
  due_at: string | null
  /** The deadline this student is held to: the later of due_at and their extension. */
  deadline: string | null
  /** True when an extension moved this student's deadline past the set's. */
  extended: boolean
  published_at: string | null
  /** The set's status for everyone (assignmentStatus); drafts never reach a student. */
  status: 'open' | 'closed'
  /** Which list it belongs on. */
  phase: 'open' | 'done'
  state: StudentSetState
  items_total: number
  items_handed_in: number
  /** The student's own mark over the work handed in, one decimal place. */
  overall_pct: number | null
  is_late: boolean
  /** Open, not yet past the deadline, and the deadline is within DUE_SOON_MS. */
  due_soon: boolean
  /** Whether /api/mark/process would accept a hand-in against this set now. */
  can_hand_in: boolean
  /** The teacher left this student a note on the set. */
  has_teacher_note: boolean
}

/** A deadline this close counts as "due soon" (the crimson DUE stamp). */
export const DUE_SOON_MS = 48 * 60 * 60 * 1000

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

function flagsRow(setId: string, flags: StudentFlags | null): AssignmentStudentFlags | null {
  if (!flags) return null
  return {
    assignment_id: setId,
    student_id: '',
    excused_at: flags.excused_at ?? null,
    extended_due_at: flags.extended_due_at ?? null,
    feedback: flags.feedback ?? null,
    feedback_at: flags.feedback_at ?? null,
    reminded_at: null,
  }
}

/**
 * Whether a hand-in would be accepted: the same rule as
 * validateAssignmentItemForStudent (published, not deleted, and — once the
 * set has closed — only when the teacher allows late work, which is the
 * default).
 */
export function canHandIn(set: Pick<StudentSetRow, 'published_at' | 'archived_at' | 'closed_at' | 'due_at' | 'settings'>, now: Date): boolean {
  if (!set.published_at || set.archived_at) return false
  if (assignmentStatus(set, now) === 'open') return true
  return set.settings?.allow_late !== false
}

/**
 * The student's view of one set. `items`, `submissions` and `flags` are the
 * student's own rows (RLS already scopes them); rows for other sets are
 * ignored, so callers may pass everything they loaded.
 */
export function deriveStudentAssignment(input: {
  set: StudentSetRow
  classroom: { id: string; name: string }
  items: readonly AssignmentItem[]
  submissions: readonly AssignmentSubmission[]
  flags: StudentFlags | null
  now: Date
}): StudentAssignment {
  const { set, flags, now } = input
  const items = input.items.filter((i) => i.assignment_id === set.id)
  const submissions = input.submissions.filter((s) => s.assignment_id === set.id)

  // A student can only see a set while they are an active member (RLS), so
  // the membership is 'active' by construction.
  const derived = deriveStudentState({
    membership: 'active',
    items,
    submissions,
    flags: flagsRow(set.id, flags),
    due_at: set.due_at,
  })

  const handedIn = derived.items.filter((i) => HANDED_IN_STATES.has(i.state)).length
  const total = derived.items.length
  // A set with nothing in it has nothing to hand in, so it is never "complete"
  // (the same rule summariseProgress applies for the teacher).
  const complete = total > 0 && handedIn === total
  const status = assignmentStatus(set, now) === 'open' ? 'open' : 'closed'
  const deadline = effectiveDueAt(set.due_at, flags?.extended_due_at ?? null)
  const deadlineMs = toMs(deadline)
  const dueMs = toMs(set.due_at)
  const pastDeadline = deadlineMs !== null && deadlineMs < now.getTime()

  let state: StudentSetState
  if (complete) state = 'complete'
  else if (derived.excused) state = 'excused'
  else if (status === 'closed') state = 'missed'
  else if (pastDeadline) state = 'overdue'
  else if (handedIn > 0) state = 'in_progress'
  else state = 'not_started'

  const phase: StudentAssignment['phase'] =
    state === 'not_started' || state === 'in_progress' || state === 'overdue' ? 'open' : 'done'

  return {
    id: set.id,
    href: assignmentReturnPath(set.id),
    title: set.title,
    kind: set.kind,
    is_mock: Boolean(set.is_mock),
    classroom: input.classroom,
    due_at: set.due_at,
    deadline,
    extended: deadlineMs !== null && (dueMs === null || deadlineMs > dueMs),
    published_at: set.published_at,
    status,
    phase,
    state,
    items_total: total,
    items_handed_in: handedIn,
    overall_pct: derived.overall_pct,
    is_late: derived.is_late,
    due_soon:
      phase === 'open' && !pastDeadline && deadlineMs !== null && deadlineMs - now.getTime() <= DUE_SOON_MS,
    can_hand_in: canHandIn(set, now),
    has_teacher_note: Boolean(flags?.feedback?.trim()),
  }
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const KIND_LABELS: Record<AssignmentKind, string> = {
  question_set: 'Questions',
  whole_paper: 'Whole paper',
  topic_drill: 'Topic drill',
  practice_prompt: 'Practice question',
}

export function kindLabel(kind: AssignmentKind): string {
  return KIND_LABELS[kind] ?? 'Set'
}

export type ChipTone = 'ok' | 'no' | 'warn' | 'dim' | 'outline'

/**
 * The one chip a set carries on the student's list and page. Crimson ('no')
 * is kept for "late" and "missed" so it always means the same thing.
 */
export function studentSetChip(
  a: Pick<StudentAssignment, 'state' | 'is_late' | 'due_soon' | 'can_hand_in'>
): { label: string; tone: ChipTone } {
  switch (a.state) {
    case 'complete':
      return a.is_late ? { label: 'Handed in late', tone: 'warn' } : { label: 'Handed in', tone: 'ok' }
    case 'excused':
      return { label: 'Excused', tone: 'dim' }
    case 'missed':
      return { label: a.can_hand_in ? 'Missed — late work accepted' : 'Missed', tone: 'no' }
    case 'overdue':
      return { label: 'Late', tone: 'no' }
    case 'in_progress':
      return a.due_soon ? { label: 'Due soon', tone: 'warn' } : { label: 'Started', tone: 'outline' }
    case 'not_started':
      return a.due_soon ? { label: 'Due soon', tone: 'warn' } : { label: 'To do', tone: 'outline' }
  }
}

/** "2 of 3 handed in" / "Nothing to hand in". */
export function progressLabel(a: Pick<StudentAssignment, 'items_total' | 'items_handed_in'>): string {
  if (a.items_total === 0) return 'Nothing to hand in'
  if (a.items_total === 1) return a.items_handed_in > 0 ? 'Handed in' : 'Not handed in yet'
  return `${a.items_handed_in} of ${a.items_total} handed in`
}

/** 87.5 → "88%" for display; null stays null. */
export function pctLabel(pct: number | null | undefined): string | null {
  return typeof pct === 'number' && Number.isFinite(pct) ? `${Math.round(pct)}%` : null
}

// ---------------------------------------------------------------------------
// Ordering and paging
// ---------------------------------------------------------------------------

/** Open work: soonest deadline first (none last), then newest set, then id. */
export function sortOpenSets<T extends Pick<StudentAssignment, 'id' | 'deadline' | 'published_at'>>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => {
    const da = toMs(a.deadline)
    const db = toMs(b.deadline)
    if (da !== db) {
      if (da === null) return 1
      if (db === null) return -1
      return da - db
    }
    const pa = toMs(a.published_at) ?? 0
    const pb = toMs(b.published_at) ?? 0
    if (pa !== pb) return pb - pa
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}

/** Done work is listed most recent first, by deadline (or publication when there is none). */
export function doneSortKey(a: Pick<StudentAssignment, 'deadline' | 'published_at'>): number {
  return toMs(a.deadline) ?? toMs(a.published_at) ?? 0
}

function compareDone(aKey: number, aId: string, bKey: number, bId: string): number {
  if (aKey !== bKey) return bKey - aKey
  return aId < bId ? -1 : aId > bId ? 1 : 0
}

export type DoneCursor = { key: number; id: string }

const DONE_CURSOR_RE = /^(-?\d{1,16})\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

/** `<sort key>.<set id>` — URL-safe as it stands, and meaningless to tamper with. */
export function encodeDoneCursor(cursor: DoneCursor): string {
  return `${Math.trunc(cursor.key)}.${cursor.id.toLowerCase()}`
}

/** The cursor, or null when it is missing or malformed. */
export function decodeDoneCursor(raw: string | null | undefined): DoneCursor | null {
  if (typeof raw !== 'string' || raw.length > 64) return null
  const m = DONE_CURSOR_RE.exec(raw.trim())
  if (!m) return null
  const key = Number(m[1])
  return Number.isSafeInteger(key) ? { key, id: m[2].toLowerCase() } : null
}

export const DONE_PAGE_SIZE = 20

/**
 * One page of the done list strictly after `cursor` (keyset: sort key, then
 * id). `next_cursor` is null on the last page.
 */
export function pageDoneSets<T extends Pick<StudentAssignment, 'id' | 'deadline' | 'published_at'>>(
  list: readonly T[],
  cursor: DoneCursor | null,
  limit: number = DONE_PAGE_SIZE
): { page: T[]; next_cursor: string | null } {
  const keyed = list
    .map((row) => ({ row, key: doneSortKey(row), id: row.id.toLowerCase() }))
    .sort((a, b) => compareDone(a.key, a.id, b.key, b.id))
  const after = cursor ? keyed.filter((k) => compareDone(k.key, k.id, cursor.key, cursor.id) > 0) : keyed
  const size = Math.max(1, Math.floor(limit))
  const page = after.slice(0, size)
  const last = page[page.length - 1]
  return {
    page: page.map((k) => k.row),
    next_cursor: after.length > size && last ? encodeDoneCursor({ key: last.key, id: last.id }) : null,
  }
}

/**
 * Whether a set belongs on a student's list at all. A set that had already
 * closed before they joined the class could never have been done by them, so
 * it would sit on their list as "missed" forever; it is left off unless they
 * handed something in for it anyway (a student who left and rejoined keeps
 * the record of work they did).
 */
export function visibleToStudent(
  set: Pick<StudentSetRow, 'published_at' | 'archived_at' | 'closed_at' | 'due_at' | 'settings'>,
  joinedAt: string | null,
  hasSubmission: boolean,
  now: Date
): boolean {
  if (!set.published_at || set.archived_at) return false
  if (hasSubmission) return true
  const joined = toMs(joinedAt)
  if (joined === null) return true
  if (assignmentStatus(set, now) === 'open') return true
  // Closed: shown only if it was still open at some point after they joined.
  return assignmentStatus(set, new Date(joined)) === 'open'
}

// ---------------------------------------------------------------------------
// The set page: one row per item
// ---------------------------------------------------------------------------

/** The student's own hand-in for an item, without ids they have no use for. */
export type StudentSubmission = Pick<
  AssignmentSubmission,
  'attempt_id' | 'attempt_count' | 'marks_earned' | 'total_marks' | 'status' | 'first_submitted_at' | 'last_submitted_at'
>

export type StudentSetItem = AssignmentItem & {
  /** 1-based, as the sheet numbers it. */
  number: number
  /** '9709/12 · May/June 2024 · Q3' — null for a teacher's own question. */
  reference: string | null
  /** The start of the banked question, or the teacher's question in full. */
  preview: string | null
  /** 'left' never occurs here: a student only sees a set while they are a member. */
  state: StudentItemState
  submission: StudentSubmission | null
  /** "Mark this" — null when the set no longer accepts work. */
  mark_href: string | null
  /** The marked script behind the hand-in. */
  attempt_href: string | null
}

export function attemptHref(attemptId: string): string {
  return `/dashboard/attempt/${encodeURIComponent(attemptId)}`
}

/**
 * The set's items as the student's sheet shows them, in position order, each
 * with its own state and either a "Mark this" link or the result.
 */
export function buildStudentSetItems(input: {
  set: Pick<Assignment, 'id' | 'title' | 'subject_code' | 'due_at'>
  items: readonly AssignmentItem[]
  submissions: readonly AssignmentSubmission[]
  flags: StudentFlags | null
  canHandIn: boolean
  /** mark_schemes.id → a short preview of the question (never the scheme). */
  previews?: ReadonlyMap<string, string | null>
}): StudentSetItem[] {
  const items = input.items
    .filter((i) => i.assignment_id === input.set.id)
    .sort((a, b) => a.position - b.position)
  const submissions = input.submissions.filter((s) => s.assignment_id === input.set.id)
  const derived = deriveStudentState({
    membership: 'active',
    items,
    submissions,
    flags: flagsRow(input.set.id, input.flags),
    due_at: input.set.due_at,
  })
  const cells = new Map(derived.items.map((c) => [c.item_id, c]))
  const byItem = new Map<string, AssignmentSubmission>()
  for (const s of submissions) {
    const held = byItem.get(s.item_id)
    if (!held || (s.marks_earned ?? -Infinity) > (held.marks_earned ?? -Infinity)) byItem.set(s.item_id, s)
  }

  return items.map((item, index) => {
    const cell = cells.get(item.id)
    const sub = byItem.get(item.id) ?? null
    const preview =
      item.item_type === 'prompt'
        ? item.prompt_text?.trim() || null
        : item.mark_scheme_id
          ? (input.previews?.get(item.mark_scheme_id) ?? null)
          : null
    return {
      ...item,
      number: index + 1,
      reference: itemReference(item),
      preview,
      state: cell?.state ?? 'missing',
      submission: sub
        ? {
            attempt_id: sub.attempt_id,
            attempt_count: sub.attempt_count,
            marks_earned: cell?.marks_earned ?? sub.marks_earned,
            total_marks: cell?.total_marks ?? sub.total_marks,
            status: sub.status,
            first_submitted_at: sub.first_submitted_at,
            last_submitted_at: sub.last_submitted_at,
          }
        : null,
      mark_href: input.canHandIn
        ? studentMarkHref(item, input.set.id, { setTitle: input.set.title, subjectCode: input.set.subject_code })
        : null,
      attempt_href: sub?.attempt_id ? attemptHref(sub.attempt_id) : null,
    }
  })
}

// ---------------------------------------------------------------------------
// Class average — the only number about classmates a student ever sees
// ---------------------------------------------------------------------------

/**
 * Fewer students than this and no average is shown: with two hand-ins, a
 * student who knows their own mark knows their classmate's exactly, and the
 * "average" is a way to read someone else's result.
 */
export const CLASS_AVERAGE_MIN_STUDENTS = 5

/** The class setting (spec §1.1 settings.student_can_see_class_avg, default false). */
export function classAverageAllowed(settings: ClassroomSettings | null | undefined): boolean {
  return settings?.student_can_see_class_avg === true
}

/**
 * Mean of each student's own percentage over the work they handed in on the
 * set (the teacher's class_mean_pct rule), as one number and a count — never
 * per student. Null when the class does not allow it or too few students have
 * a usable mark.
 */
export function classAveragePct(input: {
  settings: ClassroomSettings | null | undefined
  submissions: ReadonlyArray<Pick<AssignmentSubmission, 'student_id' | 'item_id' | 'marks_earned' | 'total_marks'>>
  items: ReadonlyArray<Pick<AssignmentItem, 'id' | 'total_marks'>>
  minStudents?: number
}): { pct: number; n: number } | null {
  if (!classAverageAllowed(input.settings)) return null
  const itemTotals = new Map(input.items.map((i) => [i.id, i.total_marks]))
  // Best row per (student, item), then per-student sums.
  const best = new Map<string, { earned: number; total: number }>()
  for (const s of input.submissions) {
    if (!itemTotals.has(s.item_id)) continue
    const earned = s.marks_earned
    const total = s.total_marks ?? itemTotals.get(s.item_id) ?? null
    if (earned === null || total === null || !Number.isFinite(earned) || !Number.isFinite(total) || total <= 0) continue
    const key = `${s.student_id}\u0000${s.item_id}`
    const held = best.get(key)
    if (!held || earned > held.earned) best.set(key, { earned, total })
  }
  const perStudent = new Map<string, { earned: number; total: number }>()
  for (const [key, mark] of best) {
    const student = key.slice(0, key.indexOf('\u0000'))
    const acc = perStudent.get(student) ?? { earned: 0, total: 0 }
    acc.earned += mark.earned
    acc.total += mark.total
    perStudent.set(student, acc)
  }
  const min = Math.max(1, Math.floor(input.minStudents ?? CLASS_AVERAGE_MIN_STUDENTS))
  if (perStudent.size < min) return null
  let sum = 0
  for (const s of perStudent.values()) sum += (s.earned / s.total) * 100
  return { pct: Math.round((sum / perStudent.size) * 10) / 10, n: perStudent.size }
}

// ---------------------------------------------------------------------------
// A teacher's review of one attempt, as the student reads it
// ---------------------------------------------------------------------------

export type TeacherReviewRow = {
  decision: ReviewDecision | null
  created_at: string
  teacher_id: string
  reasoning_note: string | null
  teacher_notes: string | null
}

export type TeacherReviewSummary = {
  kind: 'remarked' | 'checked'
  /** The stamp the teacher's own console uses: OV re-marked, OK confirmed. */
  stamp: 'OV' | 'OK'
  /** "Re-marked by your teacher: 6 → 7" */
  headline: string
  /** "out of 9", "Now 7/9", "7/9 stands" — or null when the numbers are unknown. */
  detail: string | null
  /** The teacher's note on the decision, plain text. */
  note: string | null
  teacher_id: string
  reviewed_at: string
}

/** 7 → "7", 6.5 → "6.5". */
export function formatMark(value: number): string {
  return Number.isInteger(value) ? String(value) : (Math.round(value * 10) / 10).toString()
}

function finite(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

/**
 * What the attempt page tells the student about their teacher's decisions.
 *
 * `rows` are the decisions the student may see (RLS already drops rows with
 * student_visible = false). Flags are the teacher's private note-to-self and
 * are ignored even if one arrives visible. `originalMarks` is the marker's
 * own total (ai_marking.original_marks_earned, kept on the first override);
 * `currentMarks` is the attempt's mark now — what the student sees
 * everywhere else, so the "→" always ends on it.
 */
export function summariseTeacherReview(input: {
  rows: readonly TeacherReviewRow[]
  originalMarks: number | null | undefined
  currentMarks: number | null | undefined
  totalMarks: number | null | undefined
}): TeacherReviewSummary | null {
  const visible = input.rows
    .map((r) => ({ ...r, decision: r.decision ?? 'override' }))
    .filter((r) => r.decision === 'confirm' || r.decision === 'override')
    .sort((a, b) => (toMs(a.created_at) ?? 0) - (toMs(b.created_at) ?? 0))
  if (visible.length === 0) return null

  const latest = visible[visible.length - 1]
  const original = finite(input.originalMarks)
  const current = finite(input.currentMarks)
  const total = finite(input.totalMarks)
  const outOf = total !== null && total > 0 ? `/${formatMark(total)}` : ''
  const note =
    [...visible]
      .reverse()
      .map((r) => (r.reasoning_note ?? r.teacher_notes ?? '').trim())
      .find((n) => n.length > 0) ?? null

  const base = { note, teacher_id: latest.teacher_id, reviewed_at: latest.created_at }

  if (visible.some((r) => r.decision === 'override')) {
    if (original !== null && current !== null && original !== current) {
      return {
        ...base,
        kind: 'remarked',
        stamp: 'OV',
        headline: `Re-marked by your teacher: ${formatMark(original)} → ${formatMark(current)}`,
        detail: total !== null && total > 0 ? `out of ${formatMark(total)}` : null,
      }
    }
    return {
      ...base,
      kind: 'remarked',
      stamp: 'OV',
      headline: 'Re-marked by your teacher',
      detail: current !== null ? `Now ${formatMark(current)}${outOf}` : null,
    }
  }

  return {
    ...base,
    kind: 'checked',
    stamp: 'OK',
    headline: 'Checked by your teacher',
    detail: current !== null ? `${formatMark(current)}${outOf} stands` : 'The mark stands',
  }
}

// ---------------------------------------------------------------------------
// Privacy export — audit rows about the student
// ---------------------------------------------------------------------------

/** Audit meta keys that describe the student's own work and nothing else. */
const EXPORTABLE_AUDIT_META = ['attempt_id', 'assignment_id', 'feedback_id', 'scope', 'deleted', 'cleared'] as const
/** Override details, released only when the decision itself was shown to the student. */
const VISIBLE_OVERRIDE_META = ['decision', 'marks_before', 'marks_after', 'total_marks'] as const

/**
 * The part of an audit row's meta a student's own data export carries. A
 * teacher's private decision (student_visible = false) stays private: the
 * export says the teacher reviewed the attempt, not what they decided.
 */
export function exportableAuditDetails(action: string, meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {}
  const source = meta as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of EXPORTABLE_AUDIT_META) {
    if (key in source) out[key] = source[key]
  }
  if (action === 'override' && source.student_visible === true) {
    for (const key of VISIBLE_OVERRIDE_META) {
      if (key in source) out[key] = source[key]
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// POST /api/feedback/read
// ---------------------------------------------------------------------------

/** More notes than any one page shows; bounds the RPC's array. */
export const MAX_FEEDBACK_READ_IDS = 100

const FEEDBACK_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * `{ids: uuid[]}` → the distinct, lower-cased ids, or the problem. The RPC
 * only ever touches the caller's own unread rows, so a wrong id is harmless;
 * this is about refusing garbage before it reaches the database.
 */
export function parseFeedbackReadBody(
  body: unknown
): { ok: true; ids: string[] } | { ok: false; error: string; field: 'ids' } {
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? (body as { ids?: unknown }).ids : undefined
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: 'Send the notes to mark as read as `ids`.', field: 'ids' }
  }
  if (raw.length > MAX_FEEDBACK_READ_IDS) {
    return { ok: false, error: `At most ${MAX_FEEDBACK_READ_IDS} notes at a time.`, field: 'ids' }
  }
  const ids = new Set<string>()
  for (const id of raw) {
    if (typeof id !== 'string' || !FEEDBACK_ID_RE.test(id.trim())) {
      return { ok: false, error: 'Every id must be a note id.', field: 'ids' }
    }
    ids.add(id.trim().toLowerCase())
  }
  return { ok: true, ids: [...ids] }
}
