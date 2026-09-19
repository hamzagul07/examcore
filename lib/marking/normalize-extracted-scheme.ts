import type { MarkingStyle } from './types'

/**
 * Translate a freshly extracted question into the shapes the validator and the
 * marking prompts expect — without inventing anything the scheme did not say.
 *
 * Why this exists: components typed `mixed` (9699/1x, 9609/1x, 9990/1x,
 * 9084/1x…) told the extractor only to use "the appropriate sub-structure", so
 * Gemini returned the official scheme faithfully but in its own words — a
 * `marking_guidance` prose block for "1 mark for identifying… (2 × 4 marks)"
 * allocations, and a `levels` array with "8–10" strings for banded questions.
 * `validateExtractedQuestion` rightly rejects both, so from 2026-08-24 no
 * mixed-component scheme was ever cached and every such student was marked
 * against a derived rubric instead of the published one. Diagnosed on a 9699/12
 * Oct/Nov 2025 script where all four questions went that way.
 *
 * The prompt now asks for the structured shapes directly; this layer catches
 * the model drifting back. It is a translation, not a repair: a shape it cannot
 * map faithfully is returned unchanged for the validator to reject.
 */

type Obj = Record<string, unknown>
export type ConcreteMarkingStyle = Exclude<MarkingStyle, 'mixed'>

export type NormalisedBand = {
  level: number
  marks_min: number
  marks_max: number
  descriptor: string
}

export type NormalisedMark = {
  id: number
  type: string
  value: number
  description: string
}

/** Prose fields the model has been seen using for the mark allocation. */
const GUIDANCE_KEYS = [
  'marking_guidance',
  'guidance',
  'marking_notes',
  'mark_allocation',
  'allocation',
  'how_to_award',
  'notes',
] as const

const ZERO_BAND_DESCRIPTOR = 'No creditworthy response.'

/**
 * Scheme fields the model sometimes writes at the question level instead of
 * under `mark_scheme` (seen on 9699/12 2(a): a complete, correct `marks` array
 * beside `question_text`, and no `mark_scheme` key at all).
 */
const SCHEME_FIELDS = [
  'type',
  'question_style',
  'marks',
  'bands',
  'levels',
  'level_descriptors',
  'answer_key',
  'assessment_objectives',
  'indicative_content',
  'acceptable_final_answers',
  'common_errors',
  ...GUIDANCE_KEYS,
] as const

function isObj(v: unknown): v is Obj {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function toInt(v: unknown): number | null {
  const n =
    typeof v === 'number' ? v : typeof v === 'string' ? Number(v.trim()) : NaN
  return Number.isInteger(n) ? n : null
}

function concrete(v: unknown): ConcreteMarkingStyle | null {
  return v === 'mcq' || v === 'point_based' || v === 'level_of_response'
    ? v
    : null
}

function guidanceText(ms: Obj): string {
  return GUIDANCE_KEYS.map((k) => ms[k])
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .join('\n')
}

const MARK_FOR = /\b\d+\s+marks?\s+for\b/i

function hasStructureFor(style: ConcreteMarkingStyle, ms: Obj): boolean {
  if (style === 'mcq') {
    return isObj(ms.answer_key) && Object.keys(ms.answer_key).length > 0
  }
  if (style === 'level_of_response') {
    return (
      Array.isArray(ms.bands) ||
      Array.isArray(ms.levels) ||
      Array.isArray(ms.level_descriptors)
    )
  }
  return (
    (Array.isArray(ms.marks) && ms.marks.length > 0) ||
    MARK_FOR.test(guidanceText(ms))
  )
}

function inferStyle(ms: Obj): ConcreteMarkingStyle | null {
  if (hasStructureFor('mcq', ms)) return 'mcq'
  if (hasStructureFor('level_of_response', ms)) return 'level_of_response'
  if (hasStructureFor('point_based', ms)) return 'point_based'
  return null
}

/**
 * The concrete style a question should be validated and marked as. A declared
 * style wins when its structure is actually present; otherwise the structure
 * decides, so a `type: "mixed"` (or a missing type) never leaks into the cache
 * where it would route a banded essay to the point-based prompt.
 */
export function resolveExtractedStyle(
  q: Obj,
  ms: Obj
): ConcreteMarkingStyle | null {
  const declared =
    concrete(ms.type) ??
    concrete(ms.question_style) ??
    concrete(q.marking_type)
  if (declared && hasStructureFor(declared, ms)) return declared
  return inferStyle(ms) ?? declared
}

/** "8-10", "8–10 marks", "8 to 10", "8", 8 → [8, 10]. */
export function parseMarkRange(v: unknown): [number, number] | null {
  if (typeof v === 'number') return Number.isInteger(v) && v >= 0 ? [v, v] : null
  if (typeof v !== 'string') return null
  const s = v.trim()
  const pair = s.match(/^(\d+)\s*(?:[-–—]|to)\s*(\d+)(?:\s*marks?)?$/i)
  if (pair) {
    const a = Number(pair[1])
    const b = Number(pair[2])
    return [Math.min(a, b), Math.max(a, b)]
  }
  const single = s.match(/^(\d+)(?:\s*marks?)?$/i)
  return single ? [Number(single[1]), Number(single[1])] : null
}

function descriptorOf(row: Obj): string {
  for (const key of ['descriptor', 'description', 'text', 'criteria']) {
    const v = row[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
      return (v as string[]).map((x) => x.trim()).filter(Boolean).join('\n')
    }
  }
  return ''
}

/**
 * Bands as the validator wants them: integer marks_min / marks_max, sorted,
 * with the Level 0 band present. Cambridge schemes always print "Level 0:
 * 0 marks — no creditworthy response"; when the model drops it, the lowest
 * band starts at 1 and the scale no longer tiles from 0, so it is restored.
 * Anything that cannot be read as a range returns null (reject, don't guess).
 */
export function normaliseBands(raw: unknown): NormalisedBand[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out: NormalisedBand[] = []
  let missingLevel = false
  for (const row of raw) {
    if (!isObj(row)) return null
    let min = toInt(row.marks_min ?? row.min ?? row.min_marks ?? row.lower)
    let max = toInt(row.marks_max ?? row.max ?? row.max_marks ?? row.upper)
    if (min === null || max === null) {
      const range = parseMarkRange(
        row.marks ?? row.range ?? row.mark_range ?? row.marks_range
      )
      if (!range) return null
      ;[min, max] = range
    }
    if (min < 0 || max < min) return null
    const level = toInt(row.level ?? row.band)
    if (level === null) missingLevel = true
    out.push({
      level: level ?? -1,
      marks_min: min,
      marks_max: max,
      descriptor: descriptorOf(row),
    })
  }
  out.sort((a, b) => a.marks_min - b.marks_min)
  if (out[0].marks_min === 1) {
    out.unshift({
      level: 0,
      marks_min: 0,
      marks_max: 0,
      descriptor: ZERO_BAND_DESCRIPTOR,
    })
  }
  if (missingLevel) {
    const base = out[0].marks_min === 0 ? 0 : 1
    out.forEach((band, i) => {
      band.level = base + i
    })
  }
  return out
}

function singular(noun: string): string {
  const n = noun.toLowerCase()
  if (n.endsWith('ies')) return `${n.slice(0, -3)}y`
  if (n.endsWith('sses')) return n.slice(0, -2)
  if (n.endsWith('s') && !n.endsWith('ss')) return n.slice(0, -1)
  return n
}

function capitalise(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

/**
 * Read a social-science point allocation out of the examiner's prose:
 *
 *   Reward a maximum of two ways. Up to 4 marks are available for each way:
 *   1 mark for making a point (e.g. …).
 *   1 mark for explaining that point (e.g. …).
 *   …
 *   (2 × 4 marks)
 *
 * becomes eight 1-mark entries, "Way 1: making a point…" through "Way 2: …".
 * The unit lines must multiply exactly to the question total (using the
 * explicit "(2 × 4 marks)" when present); anything else returns null.
 */
export function marksFromGuidance(
  text: string,
  totalMarks: number
): NormalisedMark[] | null {
  if (!text.trim() || !(totalMarks > 0)) return null

  const units: Array<{ value: number; description: string }> = []
  const pieces = text
    .split('\n')
    .flatMap((line) => line.split(/(?<=[.;])\s+(?=(?:award\s+)?\d+\s+marks?\s+for\b)/i))
  for (const piece of pieces) {
    const m = piece
      .trim()
      .match(/^(?:[•\-–*]|\d+[.)])?\s*(?:award\s+)?(\d+)\s+marks?\s+for\s+(.+?)\s*$/i)
    if (!m) continue
    const value = Number(m[1])
    if (!Number.isInteger(value) || value <= 0) continue
    units.push({ value, description: m[2].trim() })
  }
  if (units.length === 0) return null

  const unitSum = units.reduce((s, u) => s + u.value, 0)
  let repeats: number | null = null
  const explicit = text.match(/(\d+)\s*[x×]\s*(\d+)\s*marks?/i)
  if (explicit) {
    const count = Number(explicit[1])
    const per = Number(explicit[2])
    if (count * per === totalMarks && per === unitSum) repeats = count
  }
  if (repeats === null) {
    if (unitSum === totalMarks) repeats = 1
    else if (totalMarks % unitSum === 0) repeats = totalMarks / unitSum
    else return null
  }

  // "Reward a maximum of two ways" / "for each strength, up to 3 marks" /
  // "1 mark for each valid point" — the thing being repeated, singular.
  const phrase =
    text.match(/maximum of (?:one|two|three|four|five|\d+)\s+([a-z]+)/i)?.[1] ??
    text.match(/for each\s+((?:[a-z]+\s+){0,2}[a-z]+)/i)?.[1] ??
    'point'
  const noun = capitalise(singular(phrase.trim().split(/\s+/).pop() ?? 'point'))
  for (const unit of units) {
    unit.description = unit.description.replace(/^each\s+/i, '')
  }

  const marks: NormalisedMark[] = []
  let id = 1
  for (let i = 0; i < repeats; i++) {
    for (const unit of units) {
      marks.push({
        id: id++,
        type: 'B1',
        value: unit.value,
        description:
          repeats > 1 ? `${noun} ${i + 1}: ${unit.description}` : unit.description,
      })
    }
  }
  return marks
}

/** Rebuild `mark_scheme` from scheme fields the model left at the question level. */
function liftQuestionLevelScheme(q: Obj): Obj | null {
  const lifted: Obj = {}
  for (const key of SCHEME_FIELDS) {
    if (q[key] !== undefined && key !== 'type') lifted[key] = q[key]
  }
  if (!('marks' in lifted || 'bands' in lifted || 'levels' in lifted ||
        'level_descriptors' in lifted || 'answer_key' in lifted ||
        MARK_FOR.test(guidanceText(lifted)))) {
    return null
  }
  return lifted
}

/**
 * Normalise one extracted question. Returns a new object; the input is never
 * mutated. When nothing can be mapped the question comes back as it was.
 */
export function normalizeExtractedQuestion(
  q: Obj,
  paperMarkingType: MarkingStyle
): Obj {
  const ms = isObj(q.mark_scheme) ? q.mark_scheme : liftQuestionLevelScheme(q)
  if (!ms) return q
  const scheme: Obj = { ...ms }
  const style = resolveExtractedStyle(q, scheme) ?? concrete(paperMarkingType)
  if (!style) return q

  if (style === 'level_of_response') {
    const source = scheme.bands ?? scheme.levels ?? scheme.level_descriptors
    const bands = normaliseBands(source)
    if (bands) {
      scheme.bands = bands
      delete scheme.levels
      delete scheme.level_descriptors
    }
  }

  if (style === 'point_based') {
    const hasMarks = Array.isArray(scheme.marks) && scheme.marks.length > 0
    if (!hasMarks) {
      const total = toInt(q.total_marks)
      const marks = total ? marksFromGuidance(guidanceText(scheme), total) : null
      if (marks) scheme.marks = marks
    }
  }

  scheme.type = style
  delete scheme.question_style
  return { ...q, mark_scheme: scheme, marking_type: style }
}
