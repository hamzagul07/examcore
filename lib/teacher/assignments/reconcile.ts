/**
 * Which marked attempts hand in which set items, and what each student's
 * assignment_submissions row should then say (docs/TEACHER_SYSTEM_SPEC.md
 * conflict ruling "Reconciliation key"; CONTRACTS.md §2 reconciliation order).
 *
 * Two callers share this, so a hand-in means the same thing however it
 * arrived:
 *
 *   - onAttemptMarked, straight after a mark (one attempt, one or more items);
 *   - reconcileAssignment, when the teacher opens a set (every attempt its
 *     students marked since it was set) — which is how a mark made from plain
 *     /mark on the set's question is counted.
 *
 * An attempt hands in an item when, in this order:
 *
 *   1. it was stamped with that item (attempts.assignment_item_id), or
 *   2. it is the same banked question (attempts.mark_scheme_id equality), or
 *   3. its question key matches (legacyAttemptKey / legacyItemKey — the item's
 *      scheme row was deleted, or the bank holds two rows for one question), or
 *   4. it is the same whole paper (wholePaperAttemptKey / wholePaperItemKey).
 *
 * Prompts match by stamp only: free text has no key.
 *
 * And only when it counts:
 *
 *   - it has a usable mark (a total above zero; a whole paper still being
 *     marked has none yet);
 *   - its author is on the set's roster (active, targeted) and marked it at or
 *     after both joining the class and the set being published — homework set
 *     on Monday is not handed in by a practice run the week before;
 *   - when the set refuses late work (settings.allow_late === false), it was
 *     marked before the set closed for that student (studentCloseAt: the
 *     set's close, or their extended deadline when that is later).
 *
 * The row keeps the BEST attempt (highest percentage, then marks; the one
 * already held wins a tie, so a teacher's review is not thrown away by an
 * equal retry). Teacher overrides already live in attempts.marks_earned, so
 * they count. `first_submitted_at` only ever moves earlier and
 * `last_submitted_at` only later; lateness is judged on the first hand-in
 * (isLate). The row is 'reviewed' when the attempt it counts has a confirm or
 * an override as its latest teacher decision (reviewedAttemptIds) — the same
 * rule whether the row was written by the marking hook, a reconcile or a
 * teacher's decision (planSubmissionResync), so the three never disagree
 * about which attempt counts or whether it was reviewed. Rows are never
 * deleted here: a mark captured while a student was a member is theirs to
 * keep (spec §4 join statement).
 *
 * Pure: no I/O. lib/teacher/assignments.ts does the reading and writing.
 */

import { isLate, studentCloseAt } from '@/lib/teacher/assignment-status'
import {
  legacyAttemptKey,
  legacyItemKey,
  wholePaperAttemptKey,
  wholePaperItemKey,
  type SchemeRef,
} from '@/lib/teacher/reconcile-keys'
import type { Assignment, AssignmentItem, AssignmentSubmission, ReviewDecision } from '@/lib/teacher/types'

/** A set is reconciled at most this often unless forced (spec §3: "≤1/min"). */
export const RECONCILE_MIN_INTERVAL_MS = 60_000

/**
 * The attempt columns reconciliation reads: marks, the three match keys, and
 * two scalar probes of ai_marking instead of the whole document.
 */
export const RECONCILE_ATTEMPT_COLUMNS = [
  'id',
  'user_id',
  'created_at',
  'marks_earned',
  'total_marks',
  'mark_scheme_id',
  'assignment_item_id',
  'am_paper_code:ai_marking->>paper_code',
  'am_paper_session:ai_marking->>paper_session',
  'am_upload_mode:ai_marking->>upload_mode',
  'am_phase:ai_marking->>phase',
  'mark_schemes ( paper_code, paper_session, question_number )',
].join(', ')

/** An attempt row as PostgREST returns it for RECONCILE_ATTEMPT_COLUMNS. */
export type ReconcileAttemptRow = {
  id: string
  user_id: string | null
  created_at: string
  marks_earned: number | string | null
  total_marks: number | string | null
  mark_scheme_id: string | null
  assignment_item_id: string | null
  am_paper_code?: string | null
  am_paper_session?: string | null
  am_upload_mode?: string | null
  am_phase?: string | null
  mark_schemes?: SchemeRef | SchemeRef[] | null
}

/** A submission as written (the table's columns minus its id). */
export type SubmissionWrite = Omit<AssignmentSubmission, 'id'>

export type SetForReconcile = Pick<Assignment, 'id' | 'due_at' | 'published_at' | 'closed_at' | 'settings'>

/** A student the set is for, with when they (last) joined the class. */
export type RosterEntry = { student_id: string; joined_at: string }

// ---------------------------------------------------------------------------
// Attempts
// ---------------------------------------------------------------------------

function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

/** An attempt reduced to what matching needs. */
export type Candidate = {
  id: string
  user_id: string
  created_at: string
  created_ms: number
  marks_earned: number
  total_marks: number
  mark_scheme_id: string | null
  assignment_item_id: string | null
  question_key: string | null
  paper_key: string | null
}

/**
 * The attempt as a hand-in candidate, or null when it cannot hand anything in:
 * no author, no readable timestamp, no usable mark (a total of zero or a
 * missing score), or a whole paper that is still being marked — init writes
 * the row with 0/0 and a job `phase`, and only the finished result (which has
 * `upload_mode: 'whole_paper'` and no phase) is a mark.
 */
export function toCandidate(row: ReconcileAttemptRow): Candidate | null {
  if (!row.user_id) return null
  const created = toMs(row.created_at)
  if (created === null) return null
  if (row.am_phase) return null
  const earned = num(row.marks_earned)
  const total = num(row.total_marks)
  if (earned === null || total === null || total <= 0 || earned < 0) return null

  const isWholePaper = !row.mark_scheme_id && row.am_upload_mode === 'whole_paper'
  return {
    id: row.id,
    user_id: row.user_id,
    created_at: new Date(created).toISOString(),
    created_ms: created,
    marks_earned: earned,
    total_marks: total,
    mark_scheme_id: row.mark_scheme_id ?? null,
    assignment_item_id: row.assignment_item_id ?? null,
    question_key: legacyAttemptKey({ mark_schemes: row.mark_schemes ?? null }),
    paper_key: isWholePaper
      ? wholePaperAttemptKey({ ai_marking: { paper_code: row.am_paper_code, paper_session: row.am_paper_session } })
      : null,
  }
}

export type MatchVia = 'linked' | 'reconciled'

/** How `c` hands in `item`, or null when it does not (see the module rules). */
export function attemptMatchesItem(
  c: Pick<Candidate, 'assignment_item_id' | 'mark_scheme_id' | 'question_key' | 'paper_key'>,
  item: Pick<AssignmentItem, 'id' | 'item_type' | 'mark_scheme_id' | 'paper_code' | 'paper_session' | 'question_number'>
): MatchVia | null {
  if (c.assignment_item_id && c.assignment_item_id === item.id) return 'linked'
  if (item.item_type === 'past_paper_question') {
    if (item.mark_scheme_id && c.mark_scheme_id && c.mark_scheme_id === item.mark_scheme_id) return 'reconciled'
    const key = legacyItemKey(item)
    if (key && c.question_key === key) return 'reconciled'
    return null
  }
  if (item.item_type === 'whole_paper') {
    const key = wholePaperItemKey(item)
    if (key && c.paper_key === key) return 'reconciled'
  }
  return null
}

/**
 * The window in which a student's marks count for a set: from the later of
 * joining and publication, to when the set closes for THEM when it refuses
 * late work — the set's close, or their extended deadline when that is later
 * (studentCloseAt), so work a student hands in inside their extension is
 * never dropped. Null when the set is not published (nothing counts for a
 * draft).
 */
export function submissionWindow(
  set: Pick<SetForReconcile, 'published_at' | 'closed_at' | 'due_at' | 'settings'>,
  joinedAt: string | null,
  extendedDueAt: string | null = null
): { from: number; to: number | null } | null {
  const published = toMs(set.published_at)
  if (published === null) return null
  const joined = toMs(joinedAt)
  if (joined === null) return null
  const to = set.settings?.allow_late === false ? toMs(studentCloseAt(set, extendedDueAt)) : null
  return { from: Math.max(published, joined), to }
}

// ---------------------------------------------------------------------------
// One (item, student) row
// ---------------------------------------------------------------------------

export type MatchedAttempt = { candidate: Candidate; via: MatchVia }

type Contender = {
  attempt_id: string | null
  marks_earned: number | null
  total_marks: number | null
  created_ms: number
  held: boolean
}

function pct(c: Contender): number {
  if (c.marks_earned === null || c.total_marks === null || c.total_marks <= 0) return -1
  return c.marks_earned / c.total_marks
}

/** Best first: percentage, then raw marks, then the one already held, then the earlier. */
function better(a: Contender, b: Contender): number {
  const byPct = pct(b) - pct(a)
  if (Math.abs(byPct) > 1e-9) return byPct
  const byMarks = (b.marks_earned ?? -1) - (a.marks_earned ?? -1)
  if (Math.abs(byMarks) > 1e-9) return byMarks
  if (a.held !== b.held) return a.held ? -1 : 1
  return a.created_ms - b.created_ms
}

/**
 * The submission row for one (item, student) given the attempts that hand it
 * in and the row already stored, or null when no attempt hands it in (the
 * stored row, if any, then stays exactly as it is). `matches` must already be
 * filtered to this student, this item and the submission window.
 */
export function mergeSubmission(
  existing: AssignmentSubmission | null,
  matches: readonly MatchedAttempt[],
  ctx: {
    assignment: Pick<SetForReconcile, 'id' | 'due_at'>
    item: Pick<AssignmentItem, 'id' | 'total_marks'>
    studentId: string
    extendedDueAt: string | null
    /**
     * Attempts whose latest teacher decision is a confirm or an override
     * (reviewedAttemptIds). When given, the row is 'reviewed' exactly when the
     * attempt it counts is in it. When omitted — the marking hook, whose new
     * attempt cannot have been reviewed yet — a stored 'reviewed' is kept
     * while the attempt it was stored for is still the one counted.
     */
    reviewed?: ReadonlySet<string>
  }
): SubmissionWrite | null {
  const unique = new Map<string, MatchedAttempt>()
  for (const m of matches) {
    const held = unique.get(m.candidate.id)
    // The same attempt can arrive by stamp and by scheme; the stamp wins.
    if (!held || (m.via === 'linked' && held.via !== 'linked')) unique.set(m.candidate.id, m)
  }
  if (unique.size === 0) return null

  const contenders: Contender[] = [...unique.values()].map(({ candidate }) => ({
    attempt_id: candidate.id,
    marks_earned: candidate.marks_earned,
    total_marks: candidate.total_marks,
    created_ms: candidate.created_ms,
    held: existing?.attempt_id === candidate.id,
  }))
  // The stored row stands in for an attempt this read cannot see (deleted,
  // or marked before a rejoin moved the window), so nothing regresses.
  if (existing && !(existing.attempt_id && unique.has(existing.attempt_id))) {
    contenders.push({
      attempt_id: existing.attempt_id,
      marks_earned: existing.marks_earned,
      total_marks: existing.total_marks,
      created_ms: toMs(existing.last_submitted_at) ?? 0,
      held: true,
    })
  }
  contenders.sort(better)
  const best = contenders[0]

  const times = [...unique.values()].map((m) => m.candidate.created_ms)
  const existingFirst = toMs(existing?.first_submitted_at)
  const existingLast = toMs(existing?.last_submitted_at)
  const first = Math.min(...times, existingFirst ?? Infinity)
  const last = Math.max(...times, existingLast ?? -Infinity)
  const firstIso = new Date(first).toISOString()

  // Attempts are counted in time order: one newer than the stored
  // last_submitted_at has not been counted yet. A full recount (every match)
  // can only raise the number, never lower it.
  const newer = existingLast === null ? times.length : times.filter((t) => t > existingLast).length
  const distinct = new Set<string>([...unique.keys()])
  if (existing?.attempt_id) distinct.add(existing.attempt_id)
  const attemptCount = Math.max(1, (existing?.attempt_count ?? 0) + newer, distinct.size)

  const reviewed = ctx.reviewed
    ? best.attempt_id !== null && ctx.reviewed.has(best.attempt_id)
    : existing?.status === 'reviewed' && best.attempt_id !== null && best.attempt_id === existing.attempt_id
  const status: SubmissionWrite['status'] = reviewed
    ? 'reviewed'
    : isLate(firstIso, ctx.assignment.due_at, ctx.extendedDueAt)
      ? 'late'
      : 'submitted'

  const linked = existing?.source === 'linked' || [...unique.values()].some((m) => m.via === 'linked')

  return {
    assignment_id: ctx.assignment.id,
    item_id: ctx.item.id,
    student_id: ctx.studentId,
    attempt_id: best.attempt_id,
    attempt_count: attemptCount,
    marks_earned: best.marks_earned,
    total_marks: best.total_marks ?? ctx.item.total_marks ?? null,
    status,
    source: linked ? 'linked' : 'reconciled',
    first_submitted_at: firstIso,
    last_submitted_at: new Date(last).toISOString(),
  }
}

function sameNumber(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b
  return Math.abs(a - b) < 1e-9
}

function sameInstant(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b
  return toMs(a) === toMs(b)
}

/** Whether writing `next` over `existing` would change anything. */
export function submissionChanged(existing: AssignmentSubmission | null, next: SubmissionWrite): boolean {
  if (!existing) return true
  return (
    existing.attempt_id !== next.attempt_id ||
    existing.attempt_count !== next.attempt_count ||
    !sameNumber(existing.marks_earned, next.marks_earned) ||
    !sameNumber(existing.total_marks, next.total_marks) ||
    existing.status !== next.status ||
    existing.source !== next.source ||
    !sameInstant(existing.first_submitted_at, next.first_submitted_at) ||
    !sameInstant(existing.last_submitted_at, next.last_submitted_at)
  )
}

/**
 * Whether the new row is news for the teacher: a first hand-in, or a better
 * mark than the one held. A retry that did worse is recorded but not announced.
 */
export function isNewOrImproved(existing: AssignmentSubmission | null, next: SubmissionWrite): boolean {
  if (!existing) return true
  if (next.attempt_id === existing.attempt_id) return false
  const before =
    existing.marks_earned !== null && existing.total_marks ? existing.marks_earned / existing.total_marks : -1
  const after = next.marks_earned !== null && next.total_marks ? next.marks_earned / next.total_marks : -1
  return after > before + 1e-9
}

// ---------------------------------------------------------------------------
// A whole set
// ---------------------------------------------------------------------------

export type SubmissionCell = {
  item: AssignmentItem
  studentId: string
  extendedDueAt: string | null
  matches: MatchedAttempt[]
  existing: AssignmentSubmission | null
}

export type SubmissionPlan = SubmissionCell & { next: SubmissionWrite }

/**
 * Every (item, roster student) pair with at least one attempt in its window,
 * with the attempts that hand it in. Students off the roster are left alone:
 * their stored rows are history, not something to recompute.
 */
export function collectSubmissionCells(input: {
  assignment: SetForReconcile
  items: readonly AssignmentItem[]
  roster: readonly RosterEntry[]
  extensions: ReadonlyMap<string, string | null>
  attempts: readonly ReconcileAttemptRow[]
  existing: readonly AssignmentSubmission[]
}): SubmissionCell[] {
  const windows = new Map<string, { from: number; to: number | null }>()
  for (const r of input.roster) {
    const w = submissionWindow(input.assignment, r.joined_at, input.extensions.get(r.student_id) ?? null)
    if (w) windows.set(r.student_id, w)
  }
  if (windows.size === 0 || input.items.length === 0) return []

  const byStudent = new Map<string, Candidate[]>()
  const seen = new Set<string>()
  for (const row of input.attempts) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    const c = toCandidate(row)
    if (!c) continue
    const w = windows.get(c.user_id)
    if (!w || c.created_ms < w.from || (w.to !== null && c.created_ms > w.to)) continue
    const list = byStudent.get(c.user_id)
    if (list) list.push(c)
    else byStudent.set(c.user_id, [c])
  }

  const stored = new Map<string, AssignmentSubmission>()
  for (const s of input.existing) stored.set(`${s.item_id}|${s.student_id}`, s)

  const cells: SubmissionCell[] = []
  for (const [studentId, candidates] of byStudent) {
    for (const item of input.items) {
      const matches: MatchedAttempt[] = []
      for (const c of candidates) {
        const via = attemptMatchesItem(c, item)
        if (via) matches.push({ candidate: c, via })
      }
      if (matches.length === 0) continue
      cells.push({
        item,
        studentId,
        extendedDueAt: input.extensions.get(studentId) ?? null,
        matches,
        existing: stored.get(`${item.id}|${studentId}`) ?? null,
      })
    }
  }
  return cells
}

/**
 * The rows to write for a set: only cells whose stored row would change.
 * `reviewed` is passed through to mergeSubmission (see there).
 */
export function planSubmissions(
  input: Parameters<typeof collectSubmissionCells>[0] & { reviewed?: ReadonlySet<string> }
): SubmissionPlan[] {
  const plans: SubmissionPlan[] = []
  for (const cell of collectSubmissionCells(input)) {
    const next = mergeSubmission(cell.existing, cell.matches, {
      assignment: input.assignment,
      item: cell.item,
      studentId: cell.studentId,
      extendedDueAt: cell.extendedDueAt,
      reviewed: input.reviewed,
    })
    if (next && submissionChanged(cell.existing, next)) plans.push({ ...cell, next })
  }
  return plans
}

/** Every attempt id a set of cells could count: their matches and the rows they hold. */
export function cellAttemptIds(cells: readonly Pick<SubmissionCell, 'matches' | 'existing'>[]): string[] {
  const ids = new Set<string>()
  for (const cell of cells) {
    for (const m of cell.matches) ids.add(m.candidate.id)
    if (cell.existing?.attempt_id) ids.add(cell.existing.attempt_id)
  }
  return [...ids]
}

// ---------------------------------------------------------------------------
// Teacher decisions
// ---------------------------------------------------------------------------

export type DecisionRow = {
  id?: string | null
  attempt_id: string
  decision: ReviewDecision | null
  created_at: string
}

/**
 * The attempts whose LATEST teacher decision is a confirm or an override —
 * the ones a hand-in counting them shows as 'reviewed'. A later flag ("look
 * again") takes the review away. A null decision is a row from before the
 * decision column existed, which were all overrides (the column's default).
 * Ties on created_at are broken by id, newest last, as the review console
 * orders them.
 */
export function reviewedAttemptIds(rows: readonly DecisionRow[]): Set<string> {
  const latest = new Map<string, DecisionRow>()
  for (const r of rows) {
    if (!r?.attempt_id) continue
    const held = latest.get(r.attempt_id)
    if (!held) {
      latest.set(r.attempt_id, r)
      continue
    }
    const a = toMs(r.created_at) ?? -Infinity
    const b = toMs(held.created_at) ?? -Infinity
    if (a > b || (a === b && String(r.id ?? '') > String(held.id ?? ''))) latest.set(r.attempt_id, r)
  }
  const out = new Set<string>()
  for (const [attemptId, r] of latest) {
    const decision = r.decision ?? 'override'
    if (decision === 'confirm' || decision === 'override') out.add(attemptId)
  }
  return out
}

// ---------------------------------------------------------------------------
// One row again, after a teacher's decision
// ---------------------------------------------------------------------------

/**
 * The row for one (item, student) recomputed from scratch after a teacher
 * confirmed, re-marked or flagged one of the student's attempts — with the
 * same matching, window, comparator and 'reviewed' rule as reconciliation,
 * so the next reconcile of the set agrees with it and never flips the hand-in
 * back. Null when nothing hands the item in (the stored row, if any, stays).
 *
 * `attempts` are the student's attempts that might hand the item in (the
 * same query reconciliation runs, plus the attempt the row holds). The held
 * attempt always stays in the running at its CURRENT marks — an override may
 * have just changed them — even when it falls outside today's window (marked
 * before a rejoin); any other attempt must match the item and fall inside the
 * student's window. `joinedAt` null means the student is not on the set's
 * roster any more (left, removed, not targeted, set or class archived): the
 * row is their history, so only the attempt it already holds is re-read.
 */
export function planSubmissionResync(input: {
  assignment: SetForReconcile
  item: AssignmentItem
  studentId: string
  joinedAt: string | null
  extendedDueAt: string | null
  attempts: readonly ReconcileAttemptRow[]
  existing: AssignmentSubmission | null
  reviewed: ReadonlySet<string>
}): SubmissionWrite | null {
  const { assignment, item, studentId, existing } = input
  const window = input.joinedAt ? submissionWindow(assignment, input.joinedAt, input.extendedDueAt) : null
  const heldId = existing?.attempt_id ?? null
  const matches: MatchedAttempt[] = []
  const seen = new Set<string>()
  for (const row of input.attempts) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    const c = toCandidate(row)
    if (!c || c.user_id !== studentId) continue
    const held = c.id === heldId
    const via = attemptMatchesItem(c, item) ?? (held ? (existing?.source === 'linked' ? 'linked' : 'reconciled') : null)
    if (!via) continue
    if (!held) {
      if (!window) continue
      if (c.created_ms < window.from || (window.to !== null && c.created_ms > window.to)) continue
    }
    matches.push({ candidate: c, via })
  }
  return mergeSubmission(existing, matches, {
    assignment,
    item,
    studentId,
    extendedDueAt: input.extendedDueAt,
    reviewed: input.reviewed,
  })
}

/** Whether a set was reconciled too recently to do it again (unless forced). */
export function reconcileIsFresh(reconciledAt: string | null, now: Date, force = false): boolean {
  if (force) return false
  const at = toMs(reconciledAt)
  return at !== null && now.getTime() - at < RECONCILE_MIN_INTERVAL_MS && at <= now.getTime()
}
