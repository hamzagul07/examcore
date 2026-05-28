/**
 * Unified syllabus registry — extracted JSON trees for all subjects plus
 * Math (9709) bridged from lib/syllabus.ts.
 *
 * Analytics, marking tag validation, and UI badges all query through here.
 */

import {
  CAMBRIDGE_9709_SYLLABUS,
  normalizeSyllabusTags as normalize9709Tags,
  type SyllabusCode,
  type SyllabusTopic,
} from '@/lib/syllabus'

import s9084 from './9084.json'
import s9231 from './9231.json'
import s9488 from './9488.json'
import s9489 from './9489.json'
import s9607 from './9607.json'
import s9609 from './9609.json'
import s9618 from './9618.json'
import s9699 from './9699.json'
import s9700 from './9700.json'
import s9701 from './9701.json'
import s9702 from './9702.json'
import s9706 from './9706.json'
import s9708 from './9708.json'
import s9990 from './9990.json'

export type { SyllabusCode, SyllabusTopic }

type SyllabusFile = {
  subjectCode: string
  subjectName: string
  extractedAt?: string
  topics: SyllabusTopic[]
}

const EXTRACTED: Record<string, SyllabusFile> = {
  '9084': s9084 as SyllabusFile,
  '9231': s9231 as SyllabusFile,
  '9488': s9488 as SyllabusFile,
  '9489': s9489 as SyllabusFile,
  '9607': s9607 as SyllabusFile,
  '9609': s9609 as SyllabusFile,
  '9618': s9618 as SyllabusFile,
  '9699': s9699 as SyllabusFile,
  '9700': s9700 as SyllabusFile,
  '9701': s9701 as SyllabusFile,
  '9702': s9702 as SyllabusFile,
  '9706': s9706 as SyllabusFile,
  '9708': s9708 as SyllabusFile,
  '9990': s9990 as SyllabusFile,
}

const MATH_CODE = '9709'

/** Subject codes with a loadable topic tree (includes 9709). */
export function getSyllabusSubjectCodes(): string[] {
  return [MATH_CODE, ...Object.keys(EXTRACTED).sort()]
}

export function hasSyllabusTree(subjectCode: string): boolean {
  if (subjectCode === MATH_CODE) return true
  const file = EXTRACTED[subjectCode]
  return !!file?.topics?.length
}

export function getSyllabusByCode(subjectCode: string): SyllabusTopic[] | null {
  if (subjectCode === MATH_CODE) return CAMBRIDGE_9709_SYLLABUS
  const file = EXTRACTED[subjectCode]
  if (!file?.topics?.length) return null
  return file.topics
}

export function getSyllabusSubjectName(subjectCode: string): string | null {
  if (subjectCode === MATH_CODE) return 'Mathematics'
  return EXTRACTED[subjectCode]?.subjectName ?? null
}

export function getSyllabusTopicByCode(
  subjectCode: string,
  code: SyllabusCode
): SyllabusTopic | undefined {
  const syllabus = getSyllabusByCode(subjectCode)
  return syllabus?.find((t) => t.code === code)
}

export function getValidSyllabusCodes(subjectCode: string): SyllabusCode[] {
  const syllabus = getSyllabusByCode(subjectCode)
  return syllabus?.map((t) => t.code) ?? []
}

export function getTotalSyllabusTopics(subjectCode: string): number {
  return getSyllabusByCode(subjectCode)?.length ?? 0
}

/** Per-subject topic counts for admin/debug displays. */
export function getSyllabusTopicCounts(): Record<string, number> {
  const counts: Record<string, number> = {
    [MATH_CODE]: CAMBRIDGE_9709_SYLLABUS.length,
  }
  for (const [code, file] of Object.entries(EXTRACTED)) {
    counts[code] = file.topics?.length ?? 0
  }
  return counts
}

/**
 * Normalize LLM syllabus_tags for a given subject. Math (9709) delegates to
 * lib/syllabus.ts to preserve regression-safe behavior.
 */
export function normalizeSyllabusTagsForSubject(
  subjectCode: string,
  raw: unknown,
  max: number = 5
): SyllabusCode[] {
  if (subjectCode === MATH_CODE) return normalize9709Tags(raw, max)

  const valid = new Set(getValidSyllabusCodes(subjectCode))
  if (valid.size === 0 || !Array.isArray(raw)) return []

  const seen = new Set<string>()
  const out: SyllabusCode[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const code = item.trim()
    if (!valid.has(code)) continue
    if (seen.has(code)) continue
    seen.add(code)
    out.push(code)
    if (out.length >= max) break
  }
  return out
}

/** Build a marking-prompt syllabus tagging block for non-Math subjects. */
export function buildSyllabusTaggingBlock(subjectCode: string): string {
  if (subjectCode === MATH_CODE) return ''
  const syllabus = getSyllabusByCode(subjectCode)
  if (!syllabus?.length) return ''

  const byPaper = new Map<string, { paperName: string; lines: string[] }>()
  for (const t of syllabus) {
    let group = byPaper.get(t.paper)
    if (!group) {
      group = { paperName: t.paperName, lines: [] }
      byPaper.set(t.paper, group)
    }
    group.lines.push(`${t.code} ${t.name}`)
  }

  const sections = [...byPaper.entries()]
    .map(([paper, { paperName, lines }]) => {
      return `${paper} (${paperName}):\n${lines.map((l) => `- ${l}`).join('\n')}`
    })
    .join('\n\n')

  const subjectName = getSyllabusSubjectName(subjectCode) || subjectCode

  return `SYLLABUS TAGGING:
Identify which Cambridge ${subjectCode} ${subjectName} syllabus topics this question covers. Return 1-3 codes from this list:

${sections}

Return as JSON array in field "syllabus_tags". Only include codes from the list above. Be specific — only tag topics the student demonstrably used or was asked to use.`
}
