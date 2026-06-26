/**
 * Unified syllabus registry — extracted JSON parent→leaf trees for all subjects
 * plus Math (9709) bridged from lib/syllabus.ts.
 *
 * Analytics, marking tag validation, and UI badges query leaves via
 * getSyllabusByCode() (flat array). Sprint B consumers use getSyllabusTree().
 */

import {
  CAMBRIDGE_9709_SYLLABUS,
  normalizeSyllabusTags as normalize9709Tags,
  type SyllabusCode,
  type SyllabusTopic,
} from '@/lib/syllabus'

import s9084 from './9084.json'
import s2281 from './2281.json'
import s7115 from './7115.json'
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
import { IB_SYLLABI } from './ib-syllabi'

export type { SyllabusCode, SyllabusTopic }

/** Major Cambridge topic / section (parent node). */
export interface SyllabusParent {
  code: string
  paper: string
  paperName: string
  name: string
}

/** Assessable leaf — extends flat topic with parent link for tree UIs. */
export interface SyllabusLeaf extends SyllabusTopic {
  parent: string
}

export interface SyllabusTreeGroup {
  parent: SyllabusParent
  leaves: SyllabusLeaf[]
}

type SyllabusFile = {
  subjectCode: string
  subjectName: string
  extractedAt?: string
  parents?: SyllabusParent[]
  topics: (SyllabusTopic & { parent?: string })[]
}

const EXTRACTED: Record<string, SyllabusFile> = {
  '2281': s2281 as SyllabusFile,
  '7115': s7115 as SyllabusFile,
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
  ...(IB_SYLLABI as Record<string, SyllabusFile>),
}

const MATH_CODE = '9709'

function inferMathParent(code: string): string {
  const dot = code.indexOf('.')
  return dot === -1 ? code : code.slice(0, dot)
}

function inferParentFromLeafCode(
  leafCode: string,
  parentCodes: Set<string>
): string {
  const sorted = [...parentCodes].sort(
    (a, b) => b.split('.').length - a.split('.').length || b.length - a.length
  )
  for (const p of sorted) {
    if (leafCode === p) continue
    if (leafCode.startsWith(`${p}.`)) return p
  }
  const parts = leafCode.split('.')
  while (parts.length > 1) {
    parts.pop()
    const candidate = parts.join('.')
    if (parentCodes.has(candidate)) return candidate
  }
  return inferMathParent(leafCode)
}

/** 9709: each flat topic is both parent and its only leaf (no re-extraction). */
function mathTreeAsParentEqualsLeaf(): SyllabusTreeGroup[] {
  return CAMBRIDGE_9709_SYLLABUS.map((t) => {
    const parent: SyllabusParent = {
      code: t.code,
      name: t.name,
      paper: t.paper,
      paperName: t.paperName,
    }
    const leaf: SyllabusLeaf = { ...t, parent: t.code }
    return { parent, leaves: [leaf] }
  })
}

function getFile(subjectCode: string): SyllabusFile | null {
  if (subjectCode === MATH_CODE) return null
  return EXTRACTED[subjectCode] ?? null
}

/** Subject codes with a loadable topic tree (includes 9709). */
export function getSyllabusSubjectCodes(): string[] {
  return [MATH_CODE, ...Object.keys(EXTRACTED).sort()]
}

export function hasSyllabusTree(subjectCode: string): boolean {
  if (subjectCode === MATH_CODE) return true
  const file = EXTRACTED[subjectCode]
  return !!file?.topics?.length
}

/**
 * Flat leaf list for marking, mastery, and badges (unchanged API).
 * Leaves may include `parent` for extracted subjects; Math leaves infer parent from code.
 */
export function getSyllabusByCode(subjectCode: string): SyllabusTopic[] | null {
  if (subjectCode === MATH_CODE) return CAMBRIDGE_9709_SYLLABUS
  const file = EXTRACTED[subjectCode]
  if (!file?.topics?.length) return null
  return file.topics
}

export function getSyllabusParents(subjectCode: string): SyllabusParent[] {
  if (subjectCode === MATH_CODE) {
    return mathTreeAsParentEqualsLeaf().map((g) => g.parent)
  }
  const file = getFile(subjectCode)
  if (!file) return []
  if (file.parents?.length) return file.parents
  return inferParentsFromLeaves(file.topics)
}

function inferParentsFromLeaves(
  topics: (SyllabusTopic & { parent?: string })[]
): SyllabusParent[] {
  const byCode = new Map<string, SyllabusParent>()
  for (const t of topics) {
    const code = t.parent?.trim()
    if (!code || byCode.has(code)) continue
    byCode.set(code, {
      code,
      paper: t.paper,
      paperName: t.paperName,
      name: code,
    })
  }
  return [...byCode.values()].sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { numeric: true })
  )
}

/** Parent → leaves tree for Sprint B UI. */
export function getSyllabusTree(subjectCode: string): SyllabusTreeGroup[] | null {
  if (!hasSyllabusTree(subjectCode)) return null

  if (subjectCode === MATH_CODE) return mathTreeAsParentEqualsLeaf()

  const parents = getSyllabusParents(subjectCode)
  const parentCodes = new Set(parents.map((p) => p.code))
  const leaves: SyllabusLeaf[] = (getSyllabusByCode(subjectCode) ?? []).map(
    (t) => {
          const explicit = (t as { parent?: string }).parent?.trim()
          return {
            ...t,
            parent: explicit || inferParentFromLeafCode(t.code, parentCodes),
          }
        }
  )

  const parentByCode = new Map(parents.map((p) => [p.code, p]))
  const groups: SyllabusTreeGroup[] = []

  for (const parent of parents) {
    const groupLeaves = leaves.filter((l) => l.parent === parent.code)
    if (groupLeaves.length) {
      groups.push({ parent, leaves: groupLeaves })
    }
  }

  const orphanLeaves = leaves.filter((l) => !parentByCode.has(l.parent))
  if (orphanLeaves.length) {
    for (const leaf of orphanLeaves) {
      const stub: SyllabusParent = {
        code: leaf.parent,
        name: leaf.parent,
        paper: leaf.paper,
        paperName: leaf.paperName,
      }
      groups.push({ parent: stub, leaves: [leaf] })
    }
  }

  return groups
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
  return getTotalSyllabusLeaves(subjectCode)
}

/** Total assessable leaves (coverage denominator). */
export function getTotalSyllabusLeaves(subjectCode: string): number {
  const tree = getSyllabusTree(subjectCode)
  if (tree?.length) {
    return tree.reduce((n, g) => n + g.leaves.length, 0)
  }
  return getSyllabusByCode(subjectCode)?.length ?? 0
}

/** Per-subject leaf counts for admin/debug displays. */
export function getSyllabusTopicCounts(): Record<string, number> {
  const counts: Record<string, number> = {
    [MATH_CODE]: CAMBRIDGE_9709_SYLLABUS.length,
  }
  for (const [code, file] of Object.entries(EXTRACTED)) {
    counts[code] = file.topics?.length ?? 0
  }
  return counts
}

function passthroughSyllabusTags(raw: unknown, max: number): SyllabusCode[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: SyllabusCode[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const code = item.trim()
    if (!code || seen.has(code)) continue
    seen.add(code)
    out.push(code)
    if (out.length >= max) break
  }
  return out
}

/**
 * Normalize LLM syllabus_tags for a given subject. Math (9709) delegates to
 * lib/syllabus.ts to preserve regression-safe behavior.
 * When subjectCode is null, tags are returned trimmed/deduped but not filtered.
 */
export function normalizeSyllabusTagsForSubject(
  subjectCode: string | null,
  raw: unknown,
  max: number = 5
): SyllabusCode[] {
  if (!subjectCode) return passthroughSyllabusTags(raw, max)

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

/** Build a marking-prompt syllabus tagging block for non-Math subjects (leaf codes). */
export function buildSyllabusTaggingBlock(subjectCode: string): string {
  if (subjectCode === MATH_CODE) return ''
  const tree = getSyllabusTree(subjectCode)
  if (!tree?.length) return ''

  const sections = tree
    .map(({ parent, leaves }) => {
      const leafLines = leaves
        .map((l) => `- ${l.code} ${l.name}`)
        .join('\n')
      return `${parent.code} ${parent.name}:\n${leafLines}`
    })
    .join('\n\n')

  const subjectName = getSyllabusSubjectName(subjectCode) || subjectCode
  const leafCount = tree.reduce((n, g) => n + g.leaves.length, 0)
  const boardLabel = subjectCode.startsWith('ib-') ? 'IB Diploma' : `Cambridge ${subjectCode}`

  return `SYLLABUS TAGGING (LEAF LEVEL):
Identify which ${boardLabel} ${subjectName} specification points this question covers.
Return 1-3 LEAF codes from the list below (${leafCount} leaves). Tag the most specific leaf — NOT parent section codes alone.

${sections}

Return as JSON array in field "syllabus_tags". Use leaf codes only (e.g. "1.1.3", "2.1.1"). If you cannot pinpoint a leaf, use the narrowest valid code from the list. Do not invent codes.`
}
