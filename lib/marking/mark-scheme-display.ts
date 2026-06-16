import type { MarkingStyle } from '@/lib/marking/types'

export type RubricMarkPoint = {
  id: number | string
  type: string
  value: number
  description: string
  ecf_from?: string | null
}

export type RubricBand = {
  level: number
  marks_min: number
  marks_max: number
  descriptor: string
}

export type MarkSchemeRubric = {
  style: MarkingStyle
  points: RubricMarkPoint[]
  bands: RubricBand[]
  indicative_content: string[]
  common_errors: string[]
  notes: string | null
  acceptable_final_answers: string[]
  assessment_objectives: string[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => asString(v)).filter(Boolean)
}

function parsePoints(ms: Record<string, unknown>): RubricMarkPoint[] {
  const marks = ms.marks
  if (!Array.isArray(marks)) return []
  return marks
    .map((raw, idx): RubricMarkPoint | null => {
      const m = asRecord(raw)
      if (!m) return null
      const type = asString(m.type) || `M${idx + 1}`
      const description = asString(m.description)
      if (!description) return null
      return {
        id: typeof m.id === 'number' || typeof m.id === 'string' ? m.id : idx + 1,
        type: type.toUpperCase(),
        value: typeof m.value === 'number' ? m.value : 1,
        description,
        ecf_from: asString(m.ecf_from) || null,
      }
    })
    .filter((p): p is RubricMarkPoint => p !== null)
}

function parseBands(ms: Record<string, unknown>): RubricBand[] {
  const bands = ms.bands
  if (!Array.isArray(bands)) return []
  return bands
    .map((raw) => {
      const b = asRecord(raw)
      if (!b) return null
      const level = typeof b.level === 'number' ? b.level : 0
      const descriptor = asString(b.descriptor)
      if (!level || !descriptor) return null
      return {
        level,
        marks_min: typeof b.marks_min === 'number' ? b.marks_min : 0,
        marks_max: typeof b.marks_max === 'number' ? b.marks_max : 0,
        descriptor,
      }
    })
    .filter((b): b is RubricBand => b !== null)
    .sort((a, b) => b.level - a.level)
}

export function extractMarkSchemeRubric(
  markSchemeJson: unknown,
  markingType?: MarkingStyle | null
): MarkSchemeRubric | null {
  const ms = asRecord(markSchemeJson)
  if (!ms) return null

  const style =
    markingType ??
    (asString(ms.type) as MarkingStyle | '') ??
    (asString(ms.question_style) as MarkingStyle | '') ??
    'point_based'

  const resolvedStyle: MarkingStyle =
    style === 'mcq' ||
    style === 'point_based' ||
    style === 'level_of_response' ||
    style === 'mixed'
      ? style
      : 'point_based'

  const points = parsePoints(ms)
  const bands = parseBands(ms)

  if (
    points.length === 0 &&
    bands.length === 0 &&
    !asString(ms.notes) &&
    asStringArray(ms.indicative_content).length === 0
  ) {
    return null
  }

  return {
    style: resolvedStyle,
    points,
    bands,
    indicative_content: asStringArray(ms.indicative_content),
    common_errors: asStringArray(ms.common_errors),
    notes: asString(ms.notes) || null,
    acceptable_final_answers: asStringArray(ms.acceptable_final_answers),
    assessment_objectives: asStringArray(ms.assessment_objectives),
  }
}

export function rubricPointForMarkType(
  rubric: MarkSchemeRubric | null | undefined,
  markType: string | null | undefined
): RubricMarkPoint | null {
  if (!rubric || !markType?.trim()) return null
  const key = markType.trim().toUpperCase()
  return rubric.points.find((p) => p.type.toUpperCase() === key) ?? null
}
