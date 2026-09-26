/**
 * A teacher's decision on a marked script: confirm the AI mark (OK), change it
 * (OV), or flag it to come back to (FLG) — docs/TEACHER_SYSTEM_SPEC.md §6.
 *
 * Why this is strict. `attempts` is not a teacher-only surface: marks_earned
 * feeds mastery, grade trajectory and the weekly report, and
 * `ai_marking.marks_awarded[].reasoning` / `ai_marking.teacher_notes` are
 * interpolated into the student's Omni tutor prompt
 * (lib/omni-ai/marking-context.ts). The route this replaces once accepted any
 * array and any number, so a negative total, a total above the question's
 * maximum or a 40 kB "reasoning" carrying `[[ACTION:…]]` landed unchanged —
 * and `role='teacher'` is self-assignable. (Code review 2026-09-25, §2.)
 *
 * The rules, all enforced here and answered as `400 {error, field}`:
 *
 *   - `decision` ∈ confirm | override | flag.
 *   - confirm / flag change no marks: any mark field is refused.
 *   - override on a per-mark script (`ai_marking.marks_awarded` has entries)
 *     sends back EXACTLY the script's mark ids — none added, none dropped,
 *     none twice — each with `earned: boolean`. Everything else about a mark
 *     (type, line reference, error class, the marker's reasoning) is copied
 *     from the stored entry, never from input. A teacher MAY rewrite a mark's
 *     `reasoning` (≤500) or `margin_note` (≤200): that text is stripped of
 *     HTML and capped. Text identical to the stored entry is the marker's own,
 *     echoed back, and is carried verbatim rather than capped — otherwise a
 *     verbose marker made every override of that script fail.
 *   - override on a banded / criteria / MCQ / whole-paper script (no per-mark
 *     array) accepts only the total; per-mark input is refused.
 *   - `override_total_earned` is required for an override: a whole number in
 *     [0, attempts.total_marks]. A script with no usable maximum cannot be
 *     bounded, so it cannot be overridden.
 *   - `reasoning_note` ≤1000, plain text. `student_visible` defaults to true —
 *     except on a flag, which is the teacher's note-to-self: never shown to
 *     the student (lib/teacher/notify.ts never announces one either), so
 *     `student_visible: true` on a flag is refused rather than silently
 *     leaking the note through `override_student_read`.
 *
 * Also here, because the review console runs the same logic before it posts:
 * the AI snapshot rule, the row and attempt update a decision writes, the
 * suggested total for a set of toggles, and the sentence shown for a refusal.
 *
 * Pure: no I/O, no clock. Safe in client components.
 */

import { teacherText } from '@/lib/teacher/assignments/validate'
import type { ReviewDecision } from '@/lib/teacher/types'

// ---------------------------------------------------------------------------
// Limits (teacher_overrides.reasoning_note has a DB CHECK at 1000 as backstop)
// ---------------------------------------------------------------------------

export const REVIEW_DECISIONS: readonly ReviewDecision[] = ['confirm', 'override', 'flag']

/** The ink stamp for each decision, as the console, the queue and the history show it. */
export const DECISION_STAMP: Record<ReviewDecision, string> = { confirm: 'OK', override: 'OV', flag: 'FLG' }
/** The same decision in words (screen readers, history rows). */
export const DECISION_LABEL: Record<ReviewDecision, string> = {
  confirm: 'Confirmed',
  override: 'Re-marked',
  flag: 'Flagged',
}
/** Long enough for a sentence of justification, far too short for a prompt. */
export const MAX_MARK_REASONING_CHARS = 500
export const MAX_MARGIN_NOTE_CHARS = 200
export const MAX_REASONING_NOTE_CHARS = 1000

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/**
 * One per-mark entry as stored after an override: the marker's entry, every
 * key of it kept (type, line_reference, ref_id, error_classification …), with
 * the teacher's `earned` and any rewritten text laid over it.
 *
 * `teacher_override: true` is on every entry, changed or not: it tells the
 * Omni prompt builder that the text here passed through a teacher's hands and
 * is fenced as untrusted data rather than read as marking output.
 */
export type TeacherOverrideMark = {
  mark_id: string | number
  earned: boolean
  type?: string
  reasoning?: string
  margin_note?: string | null
  line_reference?: string | null
  error_classification?: string | null
  teacher_override: true
  [key: string]: unknown
}

export type ConfirmOrFlag = {
  decision: 'confirm' | 'flag'
  reasoning_note: string | null
  student_visible: boolean
}

export type OverrideDecision = {
  decision: 'override'
  override_total_earned: number
  /** The full stored-order array for a per-mark script; null for a total-only script. */
  marks: TeacherOverrideMark[] | null
  reasoning_note: string | null
  student_visible: boolean
}

export type ValidatedDecision = ConfirmOrFlag | OverrideDecision

export type DecisionFieldError = { ok: false; error: string; field: string }
export type DecisionValidation = { ok: true; value: ValidatedDecision } | DecisionFieldError

/** What the validator needs from the attempt row. */
export type AttemptForDecision = {
  marks_earned: unknown
  total_marks: unknown
  ai_marking: unknown
}

/** How a script was marked, which decides what an override may change. */
export type ScriptMarkingMode =
  | { mode: 'per_mark'; marks: Array<Record<string, unknown>> }
  | { mode: 'total_only'; basis: 'band_result' | 'criteria_results' | 'mcq_breakdown' | 'none' }

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteNumber(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

function fail(field: string, error: string): DecisionFieldError {
  return { ok: false, error, field }
}

function present(value: unknown): boolean {
  return value !== undefined && value !== null
}

function hasContent(value: unknown): boolean {
  if (!present(value)) return false
  if (Array.isArray(value)) return value.length > 0
  if (isPlainObject(value)) return Object.keys(value).length > 0
  return true
}

/** A mark id as the console and the marker both key it: `1` and `"1"` are the same mark. */
export function markKey(id: unknown): string | null {
  if (typeof id === 'number') return Number.isFinite(id) ? String(id) : null
  if (typeof id === 'string') {
    const trimmed = id.trim()
    return trimmed ? trimmed : null
  }
  return null
}

/** The label a teacher sees for a mark: its code (M1, A1) if the id is just a number. */
function markLabel(entry: Record<string, unknown> | undefined, fallback: string): string {
  const type = entry && typeof entry.type === 'string' ? entry.type.trim() : ''
  return type && /^\d+$/.test(fallback) ? `${type} (${fallback})` : fallback
}

/**
 * Per-mark when `ai_marking.marks_awarded` holds at least one entry with an
 * id; otherwise the script was judged as a whole (a band, criteria, an MCQ
 * sheet, or a whole paper marked question by question) and only its total
 * can change.
 */
export function scriptMarkingMode(aiMarking: unknown): ScriptMarkingMode {
  const ai = isPlainObject(aiMarking) ? aiMarking : {}
  const marks = Array.isArray(ai.marks_awarded)
    ? ai.marks_awarded.filter(
        (m): m is Record<string, unknown> => isPlainObject(m) && markKey(m.mark_id) !== null
      )
    : []
  if (marks.length > 0) return { mode: 'per_mark', marks }
  if (hasContent(ai.band_result)) return { mode: 'total_only', basis: 'band_result' }
  if (hasContent(ai.criteria_results)) return { mode: 'total_only', basis: 'criteria_results' }
  if (hasContent(ai.mcq_breakdown)) return { mode: 'total_only', basis: 'mcq_breakdown' }
  return { mode: 'total_only', basis: 'none' }
}

/**
 * Optional teacher text for one field: absent → undefined (carry the stored
 * value); identical to the stored value → undefined (the marker's own words,
 * echoed back); otherwise stripped of HTML/control characters and capped.
 */
function teacherFieldText(
  raw: unknown,
  stored: unknown,
  max: number
): { value?: string; error?: 'type' | 'length' } {
  if (raw === undefined || raw === null) return {}
  if (typeof raw !== 'string') return { error: 'type' }
  if (typeof stored === 'string' && raw === stored) return {}
  const clean = teacherText(raw) ?? ''
  if (clean.length > max) return { error: 'length' }
  return { value: clean }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function parseNote(raw: unknown): { ok: true; value: string | null } | DecisionFieldError {
  if (raw === undefined || raw === null) return { ok: true, value: null }
  if (typeof raw !== 'string') return fail('reasoning_note', 'The note must be text.')
  const clean = teacherText(raw, { multiline: true }) ?? ''
  if (clean.length > MAX_REASONING_NOTE_CHARS) {
    return fail(
      'reasoning_note',
      `The note is too long — keep it to ${MAX_REASONING_NOTE_CHARS.toLocaleString('en-GB')} characters.`
    )
  }
  return { ok: true, value: clean ? clean : null }
}

function parseTotal(raw: unknown, attempt: AttemptForDecision): { ok: true; value: number } | DecisionFieldError {
  const field = 'override_total_earned'
  const max = finiteNumber(attempt.total_marks)
  if (max === null || max < 0) {
    return fail(field, 'This script has no total marks, so its mark cannot be changed.')
  }
  if (raw === undefined || raw === null || raw === '') return fail(field, 'Enter the new total mark.')
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fail(field, 'The total must be a number.')
  if (!Number.isInteger(raw)) return fail(field, 'The total must be a whole number of marks.')
  if (raw < 0 || raw > max) return fail(field, `The total must be between 0 and ${max}.`)
  return { ok: true, value: raw }
}

/**
 * The override's per-mark array, checked against the stored one and laid over
 * it. Returns the complete array in the STORED order (so ink references and
 * the student's mark list keep their order), or the first problem.
 */
function parseMarks(
  raw: unknown,
  stored: Array<Record<string, unknown>>
): { ok: true; value: TeacherOverrideMark[] } | DecisionFieldError {
  const field = 'override_marks_awarded'
  if (!Array.isArray(raw)) {
    return fail(field, 'Send every mark on the script, each with earned set to true or false.')
  }

  // A script can carry the same id twice (two "M1" entries): match the n-th
  // occurrence in the input to the n-th stored one.
  const slots = new Map<string, number[]>()
  stored.forEach((entry, index) => {
    const key = markKey(entry.mark_id) as string
    const list = slots.get(key)
    if (list) list.push(index)
    else slots.set(key, [index])
  })
  if (raw.length > stored.length) {
    // Caught per entry below too; refusing early keeps a hostile 10k-entry
    // array from being walked at all.
    const extra = raw.length - stored.length
    return fail(field, `The script has ${stored.length} marks; ${extra} more ${extra === 1 ? 'was' : 'were'} sent.`)
  }

  const used = new Map<string, number>()
  const overlay = new Map<number, { earned: boolean; reasoning?: string; margin_note?: string }>()
  for (let i = 0; i < raw.length; i += 1) {
    const path = `${field}[${i}]`
    const entry = raw[i]
    if (!isPlainObject(entry)) return fail(path, 'Each mark must be an object with a mark_id and earned.')
    const key = markKey(entry.mark_id)
    if (key === null) return fail(`${path}.mark_id`, 'Each mark needs the mark_id it had on the script.')
    const indices = slots.get(key)
    if (!indices) return fail(`${path}.mark_id`, `Mark ${key} is not on this script.`)
    const n = used.get(key) ?? 0
    if (n >= indices.length) return fail(`${path}.mark_id`, `Mark ${key} is listed more than once.`)
    used.set(key, n + 1)
    const index = indices[n] as number
    const base = stored[index] as Record<string, unknown>
    const label = markLabel(base, key)

    if (typeof entry.earned !== 'boolean') {
      return fail(`${path}.earned`, `Say whether mark ${label} is earned (true or false).`)
    }
    const reasoning = teacherFieldText(entry.reasoning, base.reasoning, MAX_MARK_REASONING_CHARS)
    if (reasoning.error === 'type') return fail(`${path}.reasoning`, `The reasoning for mark ${label} must be text.`)
    if (reasoning.error === 'length') {
      return fail(
        `${path}.reasoning`,
        `The reasoning for mark ${label} is too long — keep it to ${MAX_MARK_REASONING_CHARS} characters.`
      )
    }
    const marginNote = teacherFieldText(entry.margin_note, base.margin_note, MAX_MARGIN_NOTE_CHARS)
    if (marginNote.error === 'type') return fail(`${path}.margin_note`, `The margin note for mark ${label} must be text.`)
    if (marginNote.error === 'length') {
      return fail(
        `${path}.margin_note`,
        `The margin note for mark ${label} is too long — keep it to ${MAX_MARGIN_NOTE_CHARS} characters.`
      )
    }
    overlay.set(index, {
      earned: entry.earned,
      ...(reasoning.value !== undefined ? { reasoning: reasoning.value } : {}),
      ...(marginNote.value !== undefined ? { margin_note: marginNote.value } : {}),
    })
  }

  const missing: string[] = []
  stored.forEach((entry, index) => {
    if (!overlay.has(index)) missing.push(markLabel(entry, markKey(entry.mark_id) as string))
  })
  if (missing.length > 0) {
    const shown = missing.slice(0, 5).join(', ') + (missing.length > 5 ? ` and ${missing.length - 5} more` : '')
    return fail(field, `Every mark on the script must be sent back — missing ${shown}.`)
  }

  // Built from the stored entry, not from the input: that is the "copied from
  // the AI, never from input" rule, and it strips every key a hand-rolled
  // request might add. Only earned and the teacher's own text are laid over.
  const value = stored.map((base, index) => {
    const o = overlay.get(index) as { earned: boolean; reasoning?: string; margin_note?: string }
    const mark: TeacherOverrideMark = {
      ...base,
      mark_id: base.mark_id as string | number,
      earned: o.earned,
      teacher_override: true,
    }
    if (o.reasoning !== undefined) mark.reasoning = o.reasoning
    if (o.margin_note !== undefined) mark.margin_note = o.margin_note
    return mark
  })
  return { ok: true, value }
}

/**
 * Validate a decision body against the attempt it targets. Returns the first
 * problem as `{error, field}` (field paths like
 * `override_marks_awarded[3].earned`), or the normalised decision.
 */
export function validateDecision(body: unknown, attempt: AttemptForDecision): DecisionValidation {
  if (!isPlainObject(body)) return fail('body', 'Send the decision as a JSON object.')

  const decision = body.decision
  if (decision !== 'confirm' && decision !== 'override' && decision !== 'flag') {
    return fail('decision', 'Choose a decision: confirm, override or flag.')
  }

  const note = parseNote(body.reasoning_note)
  if (!note.ok) return note

  const visibleRaw = body.student_visible
  if (visibleRaw !== undefined && visibleRaw !== null && typeof visibleRaw !== 'boolean') {
    return fail('student_visible', 'student_visible must be true or false.')
  }
  if (decision === 'flag' && visibleRaw === true) {
    return fail('student_visible', 'A flag is private to you, so it cannot be shown to the student.')
  }
  const studentVisible = decision === 'flag' ? false : visibleRaw !== false

  if (decision === 'confirm' || decision === 'flag') {
    const verb = decision === 'confirm' ? 'Confirming' : 'Flagging'
    if (present(body.override_total_earned)) {
      return fail('override_total_earned', `${verb} keeps the mark as it is. Choose override to change it.`)
    }
    if (present(body.override_marks_awarded)) {
      return fail('override_marks_awarded', `${verb} keeps the marks as they are. Choose override to change them.`)
    }
    if (finiteNumber(attempt.marks_earned) === null) {
      return fail('decision', 'This script has no mark yet, so there is nothing to review.')
    }
    return { ok: true, value: { decision, reasoning_note: note.value, student_visible: studentVisible } }
  }

  const total = parseTotal(body.override_total_earned, attempt)
  if (!total.ok) return total

  const mode = scriptMarkingMode(attempt.ai_marking)
  let marks: TeacherOverrideMark[] | null = null
  if (mode.mode === 'per_mark') {
    const parsed = parseMarks(body.override_marks_awarded, mode.marks)
    if (!parsed.ok) return parsed
    marks = parsed.value
  } else {
    const raw = body.override_marks_awarded
    if (present(raw) && !(Array.isArray(raw) && raw.length === 0)) {
      return fail(
        'override_marks_awarded',
        'This script was marked as a whole (a band, criteria or answer sheet), so only its total can change.'
      )
    }
  }

  return {
    ok: true,
    value: {
      decision: 'override',
      override_total_earned: total.value,
      marks,
      reasoning_note: note.value,
      student_visible: studentVisible,
    },
  }
}

// ---------------------------------------------------------------------------
// The AI snapshot, and what a decision writes
// ---------------------------------------------------------------------------

/**
 * The marker's own per-mark result, which every decision row records as
 * `original_marks_awarded` (spec §6).
 *
 * Source order: the attempt's EARLIEST teacher_overrides row (it was written
 * before any teacher touched the marks); then `ai_marking.original_marks_awarded`,
 * the copy the first override persists on the attempt itself (it survives the
 * audit rows if the first teacher's account — and its rows — are deleted);
 * then the current `ai_marking.marks_awarded`, which is still the marker's
 * when nobody has overridden.
 *
 * A second override therefore never records the first teacher's work as
 * "the AI result" — the bug the previous route had.
 */
export function resolveAiSnapshot(earliestOriginal: unknown, aiMarking: unknown): unknown[] {
  if (Array.isArray(earliestOriginal)) return earliestOriginal
  const ai = isPlainObject(aiMarking) ? aiMarking : {}
  if (Array.isArray(ai.original_marks_awarded)) return ai.original_marks_awarded
  return Array.isArray(ai.marks_awarded) ? ai.marks_awarded : []
}

/** The insert for `teacher_overrides` (column names as in 20260926c). */
export type OverrideRowInsert = {
  attempt_id: string
  teacher_id: string
  classroom_id: string | null
  decision: ReviewDecision
  original_marks_awarded: unknown[]
  override_marks_awarded: unknown[]
  override_total_earned: number
  reasoning_note: string | null
  student_visible: boolean
  supersedes_override_id: string | null
}

export type DecisionWrite = {
  row: OverrideRowInsert
  /** The service-role update of `attempts` — only an override has one. */
  attemptUpdate: { marks_earned: number; ai_marking: Record<string, unknown> } | null
  /** attempts.marks_earned once the write has landed. */
  marksEarnedAfter: number
}

/**
 * Everything a validated decision writes, computed without I/O.
 *
 * confirm / flag: one row, `attempts` untouched. `override_marks_awarded` is
 * the marks the decision stands on — the AI snapshot until someone overrides,
 * the overridden marks after — so a row's marks and its
 * `override_total_earned` (= attempts.marks_earned) always describe the same
 * result, which is what the student's "re-marked 6 → 7" line reads.
 *
 * override: the row, plus `attempts.marks_earned = override_total_earned` and
 * `ai_marking` with the new marks, `teacher_override: true`,
 * `teacher_decision: 'override'` and `teacher_notes` = the note. Kept from
 * the previous route: the first override also persists the marker's result
 * (`original_marks_awarded`) and its total (`original_marks_earned`, which
 * lib/teacher/notify.ts reads as "marks before") on the attempt.
 *
 * `teacher_notes` goes into the student's own ai_marking — their result page
 * and their tutor's prompt — so it is written only when the decision is
 * student_visible; a private override clears it rather than leaving a note
 * that belonged to a different mark.
 */
export function buildDecisionWrite(input: {
  decision: ValidatedDecision
  attempt: { id: string; marks_earned: unknown; ai_marking: unknown }
  teacherId: string
  classroomId: string | null
  /** `original_marks_awarded` of the attempt's earliest teacher_overrides row, if any. */
  earliestOriginal: unknown
  /** Id of the attempt's latest teacher_overrides row (any teacher), if any. */
  previousId: string | null
}): DecisionWrite {
  const { decision } = input
  const ai = isPlainObject(input.attempt.ai_marking) ? input.attempt.ai_marking : {}
  const snapshot = resolveAiSnapshot(input.earliestOriginal, ai)
  const current = Array.isArray(ai.marks_awarded) ? ai.marks_awarded : []
  const earnedNow = finiteNumber(input.attempt.marks_earned)

  const base = {
    attempt_id: input.attempt.id,
    teacher_id: input.teacherId,
    classroom_id: input.classroomId,
    decision: decision.decision,
    original_marks_awarded: snapshot,
    reasoning_note: decision.reasoning_note,
    student_visible: decision.student_visible,
    supersedes_override_id: input.previousId,
  }

  if (decision.decision !== 'override') {
    if (earnedNow === null) throw new Error('buildDecisionWrite: a confirm or flag needs attempts.marks_earned')
    return {
      row: { ...base, override_marks_awarded: current, override_total_earned: earnedNow },
      attemptUpdate: null,
      marksEarnedAfter: earnedNow,
    }
  }

  const marks = decision.marks ?? current
  const aiAfter: Record<string, unknown> = {
    ...ai,
    teacher_override: true,
    teacher_decision: 'override',
  }
  if (decision.marks) aiAfter.marks_awarded = decision.marks
  if (!Array.isArray(ai.original_marks_awarded)) aiAfter.original_marks_awarded = snapshot
  // Only the marker's total is "original": an attempt overridden before this
  // key existed has lost it, and a guess would put a teacher's mark in its place.
  if (finiteNumber(ai.original_marks_earned) === null && ai.teacher_override !== true && earnedNow !== null) {
    aiAfter.original_marks_earned = earnedNow
  }
  if (decision.student_visible && decision.reasoning_note) aiAfter.teacher_notes = decision.reasoning_note
  else delete aiAfter.teacher_notes

  return {
    row: { ...base, override_marks_awarded: marks, override_total_earned: decision.override_total_earned },
    attemptUpdate: { marks_earned: decision.override_total_earned, ai_marking: aiAfter },
    marksEarnedAfter: decision.override_total_earned,
  }
}

// ---------------------------------------------------------------------------
// Console helpers (the client runs these; the server never trusts them)
// ---------------------------------------------------------------------------

/** "M1" → 1, "B2" → 2, "DM1" → 1, "A1 ft" → 1; null when the code carries no value. */
export function markCodeValue(type: unknown): number | null {
  if (typeof type !== 'string') return null
  const m = /^D?[MABC](\d{1,2})(?:\s*(?:ft|cao))?$/i.exec(type.trim())
  if (!m) return null
  const n = Number(m[1])
  return n >= 1 && n <= 10 ? n : null
}

/**
 * How much each per-mark entry is worth, for suggesting a total from the
 * toggles — or null when that cannot be read off the script.
 *
 * Most schemes are one mark per entry, but Cambridge codes carry their value
 * ("B2" is two marks). The weights are accepted only if they reproduce the
 * marks the script currently has: code values first, then one-per-entry.
 * When neither adds up (a marker that lists only some points, say) the
 * console stops suggesting and the teacher types the total.
 */
export function markWeights(
  marks: ReadonlyArray<{ type?: unknown; earned?: unknown }>,
  marksEarned: number | null
): number[] | null {
  if (marks.length === 0 || marksEarned === null) return null
  const earnedSum = (weights: number[]) =>
    marks.reduce((sum, m, i) => sum + (m.earned === true ? (weights[i] as number) : 0), 0)

  const codeValues = marks.map((m) => markCodeValue(m.type))
  if (codeValues.every((v) => v !== null)) {
    const weights = codeValues as number[]
    if (earnedSum(weights) === marksEarned) return weights
  }
  const ones = marks.map(() => 1)
  if (earnedSum(ones) === marksEarned) return ones
  return null
}

/** The total a set of toggles adds up to, clamped to the script's maximum; null without weights. */
export function suggestedTotal(
  earned: readonly boolean[],
  weights: readonly number[] | null,
  maxMarks: number | null
): number | null {
  if (!weights || weights.length !== earned.length) return null
  const sum = earned.reduce((acc, e, i) => acc + (e ? (weights[i] as number) : 0), 0)
  return maxMarks === null ? sum : Math.max(0, Math.min(sum, maxMarks))
}

/** The body the console posts. Only ids and `earned` go back: the server carries the rest. */
export function buildDecisionPayload(state: {
  decision: ReviewDecision
  marks?: ReadonlyArray<{ mark_id: string | number; earned: boolean }> | null
  total?: number | null
  note: string
  studentVisible: boolean
}): Record<string, unknown> {
  const note = state.note.trim()
  const payload: Record<string, unknown> = { decision: state.decision }
  if (note) payload.reasoning_note = note
  if (state.decision === 'flag') return payload
  payload.student_visible = state.studentVisible
  if (state.decision === 'override') {
    payload.override_total_earned = state.total ?? null
    if (state.marks && state.marks.length > 0) {
      payload.override_marks_awarded = state.marks.map((m) => ({ mark_id: m.mark_id, earned: m.earned }))
    }
  }
  return payload
}

/** Which part of the console a refused field belongs to, so it can be marked invalid. */
export function decisionFieldTarget(
  field: string | undefined | null
): { part: 'decision' | 'total' | 'marks' | 'note' | 'visible' | 'other'; markIndex: number | null } {
  if (!field) return { part: 'other', markIndex: null }
  if (field === 'decision') return { part: 'decision', markIndex: null }
  if (field === 'override_total_earned') return { part: 'total', markIndex: null }
  if (field === 'reasoning_note') return { part: 'note', markIndex: null }
  if (field === 'student_visible') return { part: 'visible', markIndex: null }
  const m = /^override_marks_awarded(?:\[(\d+)\])?/.exec(field)
  if (m) return { part: 'marks', markIndex: m[1] !== undefined ? Number(m[1]) : null }
  return { part: 'other', markIndex: null }
}

/**
 * One sentence for a refused or failed save. A 400 carries the server's own
 * message (it names the mark or the bound); the other statuses get a sentence
 * that says what the teacher can do about it.
 */
export function describeReviewFailure(status: number, data: { error?: unknown } | null | undefined): string {
  const raw = typeof data?.error === 'string' ? data.error.trim().replace(/[.\s]+$/, '') : ''
  // The server's sentences start with a capital; after the dash they read as a clause.
  const message = raw ? raw.charAt(0).toLowerCase() + raw.slice(1) : null
  if (status === 400 || status === 422) return `Not saved — ${message ?? 'check the decision and try again'}.`
  if (status === 401) return 'Not saved — your session has expired. Sign in again, then retry.'
  if (status === 403) return 'Not saved — only a teacher account can review scripts.'
  if (status === 404) {
    return 'Not saved — this script is no longer on your desk (the student may have left the class).'
  }
  if (status === 409) {
    return `Not saved — ${message ?? 'this script changed while you were looking at it'}. Reload and try again.`
  }
  if (status === 413) return 'Not saved — that was too much to send in one go.'
  if (status === 429) return 'Not saved — too many saves in a row. Wait a moment and try again.'
  return `Not saved — ${message ?? 'something went wrong on our side'}. Try again.`
}
