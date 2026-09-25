/**
 * Bounds on a teacher's override of an AI mark.
 *
 * The override route used to check `Array.isArray(marks) && typeof total ===
 * 'number'` and write both straight into `attempts`. That row is not a
 * teacher-only surface: `marks_earned` feeds mastery, grade trajectory and
 * the weekly report, and `ai_marking.marks_awarded[].reasoning` is
 * interpolated into the student's Omni tutor prompt
 * (lib/omni-ai/marking-context.ts). So a negative total, a total above the
 * question's maximum, or a 40 kB "reasoning" string carrying `[[ACTION:…]]`
 * all landed unchanged — a teacher (a self-assignable role) could inject
 * instructions into a student's tutor. (Code review 2026-09-25, §2 Teacher.)
 *
 * Everything in here is pure so the rules can be unit-tested without a
 * request: validate the payload against the attempt's own maximum, strip any
 * key the UI does not send, and carry the marker's own line references across
 * so the ink overlay survives an override.
 */

/** Per-mark entries are at most this many; a single question never has more. */
export const MAX_OVERRIDE_MARKS = 60
export const MAX_MARK_ID_CHARS = 20
export const MAX_MARK_TYPE_CHARS = 20
/** Long enough for a sentence of justification, far too short for a prompt. */
export const MAX_MARK_REASONING_CHARS = 500
export const MAX_MARGIN_NOTE_CHARS = 200
export const MAX_TEACHER_NOTES_CHARS = 2000

/**
 * One entry as it is stored after an override. `teacher_override: true` is on
 * every entry, changed or not: it tells the Omni prompt builder that the text
 * here was submitted by a teacher rather than produced by the marker, so it
 * is fenced as untrusted data rather than read as marking output.
 */
export type TeacherOverrideMark = {
  mark_id: string | number
  type?: string
  earned: boolean
  reasoning?: string
  margin_note?: string
  /** Carried over from the marker's entry, never from the teacher's payload. */
  line_reference?: string | null
  error_classification?: string | null
  teacher_override: true
}

/** Field path → message, e.g. `override_marks_awarded[3].reasoning`. */
export type OverrideFieldErrors = Record<string, string>

export type ValidatedOverride = {
  total: number
  marks: TeacherOverrideMark[]
  notes: string | null
}

export type OverrideValidation =
  | { ok: true; value: ValidatedOverride }
  | { ok: false; errors: OverrideFieldErrors }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Optional bounded text. Returns `undefined` when absent (so the key is not
 * written), the trimmed string when valid, or an error message.
 */
function optionalText(
  value: unknown,
  max: number
): { value?: string; error?: string } {
  if (value === undefined || value === null) return {}
  if (typeof value !== 'string') return { error: 'must be a string' }
  const trimmed = value.trim()
  if (trimmed.length > max) return { error: `must be at most ${max} characters` }
  return { value: trimmed }
}

/**
 * The marker's stored entries, keyed by mark id, so the validator can tell
 * text the teacher WROTE from text the console merely echoed back.
 *
 * The console posts every entry with the marker's own reasoning and margin
 * note intact and only `earned` flipped. Those strings are the model's
 * output, which no prompt bounds — demo fixtures already run to 352 chars —
 * so capping them at MAX_MARK_REASONING_CHARS rejected any attempt whose
 * marker was verbose: 422, nothing written, and (before the console checked
 * res.ok) a success message. A value identical to the stored one is not
 * teacher input; it is dropped from the validated entry and restored by
 * mergeOverrideMarks exactly as stored. Only text that DIFFERS is bounded.
 */
type StoredMarkText = Map<string, Record<string, unknown>>

function indexStoredMarks(stored: unknown): StoredMarkText {
  const byId: StoredMarkText = new Map()
  if (!Array.isArray(stored)) return byId
  for (const entry of stored) {
    if (!isPlainObject(entry)) continue
    const id = entry.mark_id
    if (typeof id !== 'string' && typeof id !== 'number') continue
    const key = String(id)
    if (!byId.has(key)) byId.set(key, entry)
  }
  return byId
}

/**
 * Optional bounded text that may also be the marker's own, carried over. When
 * `value` equals what is stored for this mark it is omitted (`{}`): the
 * merge restores the stored string verbatim, and the cap never applies to
 * text the teacher did not write.
 */
function optionalTextOrCarried(
  value: unknown,
  max: number,
  stored: unknown
): { value?: string; error?: string } {
  if (typeof value === 'string' && typeof stored === 'string' && value === stored) {
    return {}
  }
  return optionalText(value, max)
}

function validateMark(
  raw: unknown,
  path: string,
  errors: OverrideFieldErrors,
  storedById: StoredMarkText
): TeacherOverrideMark | null {
  if (!isPlainObject(raw)) {
    errors[path] = 'must be an object'
    return null
  }
  let ok = true

  // mark_id: the marker emits numbers for point schemes and strings such as
  // "A1" for others; both come back unchanged from the console. Strings are
  // bounded, numbers must be real numbers.
  let markId: string | number | null = null
  const rawId = raw.mark_id
  if (typeof rawId === 'number' && Number.isFinite(rawId)) {
    markId = rawId
  } else if (typeof rawId === 'string') {
    const trimmed = rawId.trim()
    if (trimmed.length === 0 || trimmed.length > MAX_MARK_ID_CHARS) {
      errors[`${path}.mark_id`] = `must be 1–${MAX_MARK_ID_CHARS} characters`
      ok = false
    } else {
      markId = trimmed
    }
  } else {
    errors[`${path}.mark_id`] = 'is required'
    ok = false
  }

  // The stored entry with this id, if any: text equal to it is the marker's
  // own and is carried across the override rather than bounded as input.
  const stored = markId === null ? undefined : storedById.get(String(markId))

  const type = optionalTextOrCarried(raw.type, MAX_MARK_TYPE_CHARS, stored?.type)
  if (type.error) {
    errors[`${path}.type`] = type.error
    ok = false
  }

  if (typeof raw.earned !== 'boolean') {
    errors[`${path}.earned`] = 'must be true or false'
    ok = false
  }

  const reasoning = optionalTextOrCarried(
    raw.reasoning,
    MAX_MARK_REASONING_CHARS,
    stored?.reasoning
  )
  if (reasoning.error) {
    errors[`${path}.reasoning`] = reasoning.error
    ok = false
  }

  const marginNote = optionalTextOrCarried(
    raw.margin_note,
    MAX_MARGIN_NOTE_CHARS,
    stored?.margin_note
  )
  if (marginNote.error) {
    errors[`${path}.margin_note`] = marginNote.error
    ok = false
  }

  if (!ok || markId === null) return null

  // Built field by field rather than spread from `raw`: that is the "strip
  // unknown keys" — nothing the console (or a hand-rolled request) adds gets
  // stored.
  const mark: TeacherOverrideMark = {
    mark_id: markId,
    earned: raw.earned as boolean,
    teacher_override: true,
  }
  if (type.value !== undefined) mark.type = type.value
  if (reasoning.value !== undefined) mark.reasoning = reasoning.value
  if (marginNote.value !== undefined) mark.margin_note = marginNote.value
  return mark
}

/**
 * Validate an override payload against the attempt it targets.
 *
 * `total_marks` is the attempt's own maximum; the override total must sit in
 * `[0, total_marks]` in half-mark steps (some boards award halves, none award
 * thirds). A row with no usable maximum cannot bound anything, so it is
 * refused rather than waved through.
 *
 * `marks_awarded` is the marker's stored result (`ai_marking.marks_awarded`).
 * Per-mark text equal to the stored text is the marker's, not the teacher's,
 * and is exempt from the length caps — see indexStoredMarks. Omit it and
 * every string is bounded as teacher input.
 */
export function validateOverride(
  body: unknown,
  attempt: { total_marks: unknown; marks_awarded?: unknown }
): OverrideValidation {
  const errors: OverrideFieldErrors = {}
  if (!isPlainObject(body)) {
    return { ok: false, errors: { body: 'must be a JSON object' } }
  }
  const storedById = indexStoredMarks(attempt.marks_awarded)

  // --- total ------------------------------------------------------------
  const max = Number(attempt.total_marks)
  const total = body.override_total_earned
  if (!Number.isFinite(max) || max < 0) {
    errors.override_total_earned =
      'this attempt has no total marks, so a score cannot be bounded'
  } else if (typeof total !== 'number' || !Number.isFinite(total)) {
    errors.override_total_earned = 'must be a number'
  } else if (total < 0 || total > max) {
    errors.override_total_earned = `must be between 0 and ${max}`
  } else if (!Number.isInteger(total * 2)) {
    errors.override_total_earned = 'must be a whole or half mark'
  }

  // --- per-mark entries ---------------------------------------------------
  const rawMarks = body.override_marks_awarded
  const marks: TeacherOverrideMark[] = []
  if (!Array.isArray(rawMarks)) {
    errors.override_marks_awarded = 'must be an array'
  } else if (rawMarks.length > MAX_OVERRIDE_MARKS) {
    errors.override_marks_awarded = `must have at most ${MAX_OVERRIDE_MARKS} entries`
  } else {
    rawMarks.forEach((raw, i) => {
      const mark = validateMark(raw, `override_marks_awarded[${i}]`, errors, storedById)
      if (mark) marks.push(mark)
    })
  }

  // --- notes ------------------------------------------------------------
  const notes = optionalText(body.teacher_notes, MAX_TEACHER_NOTES_CHARS)
  if (notes.error) errors.teacher_notes = notes.error

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      total: total as number,
      marks,
      notes: notes.value ? notes.value : null,
    },
  }
}

/** Fields of the marker's entry that are carried across an override. */
const CARRIED_TEXT_FIELDS = [
  'type',
  'reasoning',
  'margin_note',
  'line_reference',
  'error_classification',
] as const

/**
 * Lay the validated override over the marker's stored entries.
 *
 * The console sends every entry back with the marker's text intact and only
 * `earned` flipped, and the validator has just dropped every key it does not
 * know — including `line_reference`, which the student's ink overlay
 * (components/MarkingResultView.tsx) uses to place each tick on the page. So
 * for each override entry, take `line_reference` and `error_classification`
 * from the stored entry with the same id (the teacher never supplies those),
 * and fall back to the stored `type` / `reasoning` / `margin_note` when the
 * teacher omitted them. Anything the teacher did send wins.
 *
 * Entries with no stored counterpart are kept as validated: a teacher may
 * award a mark the marker did not list.
 */
export function mergeOverrideMarks(
  stored: unknown,
  override: TeacherOverrideMark[]
): TeacherOverrideMark[] {
  const byId = indexStoredMarks(stored)

  return override.map((mark) => {
    const base = byId.get(String(mark.mark_id))
    if (!base) return { ...mark }
    const merged: TeacherOverrideMark = { ...mark }
    for (const field of CARRIED_TEXT_FIELDS) {
      if (merged[field] !== undefined) continue
      const value = base[field]
      if (typeof value === 'string') merged[field] = value
      else if (
        value === null &&
        (field === 'line_reference' || field === 'error_classification')
      ) {
        merged[field] = null
      }
    }
    return merged
  })
}

/**
 * The marker's original per-mark result, for the audit row.
 *
 * Each `teacher_overrides` row stores `original_marks_awarded`, and the route
 * used to fill it from `ai_marking.marks_awarded` — which, after the first
 * override, IS the previous override. A second override therefore recorded
 * the first teacher's work as "the AI result", and the real one was gone from
 * the attempt.
 *
 * The AI result is snapshotted into `ai_marking.original_marks_awarded`
 * exactly once, on the first override, and read from there ever after.
 * Attempts overridden before the snapshot existed still have the true
 * original on their earliest audit row, so the caller passes that in as the
 * fallback.
 */
export function resolveOriginalMarks(
  aiMarking: unknown,
  earliestOverrideOriginal: unknown
): { original: unknown[]; persistSnapshot: boolean; firstOverride: boolean } {
  const ai = isPlainObject(aiMarking) ? aiMarking : {}
  const current = Array.isArray(ai.marks_awarded) ? ai.marks_awarded : []

  if (Array.isArray(ai.original_marks_awarded)) {
    return {
      original: ai.original_marks_awarded,
      persistSnapshot: false,
      firstOverride: false,
    }
  }

  if (ai.teacher_override === true) {
    // Overridden before the snapshot existed. The earliest audit row was
    // written from the untouched AI result; failing that, the current marks
    // are the best that survives.
    return {
      original: Array.isArray(earliestOverrideOriginal)
        ? earliestOverrideOriginal
        : current,
      persistSnapshot: true,
      firstOverride: false,
    }
  }

  return { original: current, persistSnapshot: true, firstOverride: true }
}
