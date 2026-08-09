import seed9709Wma from '@/content/data/curriculum-graph/caie-9709-edexcel-wma.json'
import seed9702Wph from '@/content/data/curriculum-graph/caie-9702-edexcel-wph.json'
import seed9701Wch from '@/content/data/curriculum-graph/caie-9701-edexcel-wch.json'
import seed9700Wbi from '@/content/data/curriculum-graph/caie-9700-edexcel-wbi.json'
import seedOxfordaqa from '@/content/data/curriculum-graph/caie-oxfordaqa-stem.json'
import { CAMBRIDGE_9709_SYLLABUS } from '@/lib/syllabus'
import { getSyllabusTopicByCode } from '@/lib/syllabi'
import { topicToLessonSlug } from '@/lib/courses/slug'
import type {
  BoardTopicRef,
  CanonicalConcept,
  CurriculumGraphFile,
  ResolvedCrossBoardLink,
} from '@/lib/curriculum-graph/types'

const GRAPH_FILES: CurriculumGraphFile[] = [
  seed9709Wma as CurriculumGraphFile,
  seed9702Wph as CurriculumGraphFile,
  seed9701Wch as CurriculumGraphFile,
  seed9700Wbi as CurriculumGraphFile,
  seedOxfordaqa as CurriculumGraphFile,
]

const CAIE_HUB: Record<string, string> = {
  '9709': '/caie/a-level/mathematics/9709',
  '9702': '/caie/a-level/physics/9702',
  '9701': '/caie/a-level/chemistry/9701',
  '9700': '/caie/a-level/biology/9700',
}

function edexcelSubjectSlugForUnit(unit: string): string {
  const u = unit.toUpperCase()
  if (/^W(MA|ME|ST)/.test(u) || /^9MA/.test(u)) return 'mathematics'
  if (/^WPH/.test(u) || /^9PH/.test(u)) return 'physics'
  if (/^WCH/.test(u)) return 'chemistry'
  if (/^WBI/.test(u)) return 'biology'
  return 'mathematics'
}

export function edexcelQualificationForUnit(unit: string): string {
  const u = unit.toUpperCase()
  if (/^9[A-Z]{2}0$/.test(u)) return 'a-level'
  return 'international-a-level'
}

/** Canonical Edexcel unit hub path (IAL vs UK A Level). */
export function edexcelPathForUnit(unitCode: string): string {
  const unit = unitCode.trim().toLowerCase()
  const subject = edexcelSubjectSlugForUnit(unitCode)
  const qual = edexcelQualificationForUnit(unitCode)
  return `/edexcel/${qual}/${subject}/${unit}`
}

function allConcepts(): CanonicalConcept[] {
  return GRAPH_FILES.flatMap((g) => g.concepts)
}

function refKey(ref: BoardTopicRef): string {
  const topic = ref.topicCode?.trim() ?? ''
  return `${ref.board}|${ref.syllabusOrUnit.toUpperCase()}|${topic}`
}

export function listCurriculumGraphs(): CurriculumGraphFile[] {
  return GRAPH_FILES
}

export function getMappingsForCaieTopic(
  syllabusCode: string,
  topicCode: string
): CanonicalConcept[] {
  const code = syllabusCode.trim()
  const topic = topicCode.trim()
  return allConcepts().filter((c) =>
    c.refs.some(
      (r) =>
        r.board === 'cambridge' &&
        r.syllabusOrUnit === code &&
        r.topicCode === topic
    )
  )
}

export function getMappingsForEdexcelUnit(unitCode: string): CanonicalConcept[] {
  const unit = unitCode.trim().toUpperCase()
  return allConcepts().filter((c) =>
    c.refs.some(
      (r) => r.board === 'edexcel' && r.syllabusOrUnit.toUpperCase() === unit
    )
  )
}

export function getMappingsForOxfordaqaSubject(
  contentCode: string
): CanonicalConcept[] {
  const code = contentCode.trim().toLowerCase()
  return allConcepts().filter((c) =>
    c.refs.some(
      (r) => r.board === 'oxfordaqa' && r.syllabusOrUnit.toLowerCase() === code
    )
  )
}

/** Distinct Edexcel units that overlap a CAIE syllabus (topic-grained concepts preferred). */
export function listOverlapForSubject(syllabusCode: string): Array<{
  unitCode: string
  label: string
  topicCount: number
}> {
  const code = syllabusCode.trim()
  const byUnit = new Map<string, { label: string; topics: Set<string> }>()

  for (const concept of allConcepts()) {
    const caie = concept.refs.find(
      (r) => r.board === 'cambridge' && r.syllabusOrUnit === code && r.topicCode
    )
    if (!caie?.topicCode) continue
    for (const ed of concept.refs.filter((r) => r.board === 'edexcel')) {
      const unit = ed.syllabusOrUnit.toUpperCase()
      const cur = byUnit.get(unit) ?? {
        label: ed.label ?? unit,
        topics: new Set<string>(),
      }
      cur.topics.add(caie.topicCode)
      if (ed.label) cur.label = ed.label
      byUnit.set(unit, cur)
    }
  }

  return [...byUnit.entries()]
    .map(([unitCode, v]) => ({
      unitCode,
      label: v.label,
      topicCount: v.topics.size,
    }))
    .sort((a, b) => a.unitCode.localeCompare(b.unitCode))
}

function caieShellHref(ref: BoardTopicRef): string | null {
  if (ref.board !== 'cambridge') return null
  const hub = CAIE_HUB[ref.syllabusOrUnit]
  if (!hub) return null
  if (!ref.topicCode) return hub
  const name =
    ref.label ??
    getSyllabusTopicByCode(ref.syllabusOrUnit, ref.topicCode)?.name ??
    (ref.syllabusOrUnit === '9709'
      ? CAMBRIDGE_9709_SYLLABUS.find((t) => t.code === ref.topicCode)?.name
      : undefined) ??
    ref.topicCode
  const slug = topicToLessonSlug(ref.topicCode, name)
  return `${hub}/${slug}`
}

function caieCourseHref(ref: BoardTopicRef): string | null {
  if (ref.board !== 'cambridge' || !ref.topicCode) return null
  const name =
    ref.label ??
    getSyllabusTopicByCode(ref.syllabusOrUnit, ref.topicCode)?.name ??
    (ref.syllabusOrUnit === '9709'
      ? CAMBRIDGE_9709_SYLLABUS.find((t) => t.code === ref.topicCode)?.name
      : undefined) ??
    ref.topicCode
  const slug = topicToLessonSlug(ref.topicCode, name)
  return `/courses/${ref.syllabusOrUnit}/${slug}`
}

function hrefForRef(ref: BoardTopicRef): string | null {
  if (ref.board === 'edexcel') {
    return edexcelPathForUnit(ref.syllabusOrUnit)
  }
  if (ref.board === 'oxfordaqa') {
    const slug = ref.syllabusOrUnit.replace(/^oxaqa-/i, '').toLowerCase()
    return `/oxfordaqa/international-a-level/${slug}`
  }
  return caieShellHref(ref)
}

/** Counterpart links for a CAIE topic (Edexcel / OxfordAQA). */
export function resolveEdexcelLinksForCaieTopic(
  syllabusCode: string,
  topicCode: string
): ResolvedCrossBoardLink[] {
  const concepts = getMappingsForCaieTopic(syllabusCode, topicCode)
  const seen = new Set<string>()
  const out: ResolvedCrossBoardLink[] = []

  for (const concept of concepts) {
    for (const ref of concept.refs) {
      if (ref.board !== 'edexcel' && ref.board !== 'oxfordaqa') continue
      const key = refKey(ref)
      if (seen.has(key)) continue
      const href = hrefForRef(ref)
      if (!href) continue
      seen.add(key)
      out.push({
        board: ref.board,
        label: ref.label ?? ref.syllabusOrUnit,
        href,
        syllabusOrUnit: ref.syllabusOrUnit.toUpperCase(),
        topicCode: ref.topicCode,
      })
    }
  }
  return out
}

/** Counterpart shell links for an Edexcel unit (CAIE topics / hub). */
export function resolveCaieLinksForEdexcelUnit(
  unitCode: string
): ResolvedCrossBoardLink[] {
  const concepts = getMappingsForEdexcelUnit(unitCode)
  const seen = new Set<string>()
  const out: ResolvedCrossBoardLink[] = []

  for (const concept of concepts) {
    for (const ref of concept.refs) {
      if (ref.board !== 'cambridge') continue
      if (!ref.topicCode) continue
      const key = refKey(ref)
      if (seen.has(key)) continue
      const href = caieShellHref(ref)
      if (!href) continue
      seen.add(key)
      out.push({
        board: 'cambridge',
        label: ref.label ?? `${ref.syllabusOrUnit} ${ref.topicCode}`,
        href,
        syllabusOrUnit: ref.syllabusOrUnit,
        topicCode: ref.topicCode,
      })
    }
  }
  return out
}

/**
 * Mapped CAIE lesson course URLs for an Edexcel unit — reuse existing
 * content/courses JSON (no board fork).
 */
export function resolveCourseLinksForEdexcelUnit(
  unitCode: string
): ResolvedCrossBoardLink[] {
  const concepts = getMappingsForEdexcelUnit(unitCode)
  const seen = new Set<string>()
  const out: ResolvedCrossBoardLink[] = []

  for (const concept of concepts) {
    for (const ref of concept.refs) {
      if (ref.board !== 'cambridge' || !ref.topicCode) continue
      const key = `course|${refKey(ref)}`
      if (seen.has(key)) continue
      const href = caieCourseHref(ref)
      if (!href) continue
      seen.add(key)
      out.push({
        board: 'cambridge',
        label: ref.label ?? `${ref.syllabusOrUnit} ${ref.topicCode}`,
        href,
        syllabusOrUnit: ref.syllabusOrUnit,
        topicCode: ref.topicCode,
      })
    }
  }
  return out
}

export function resolveCourseLinksForOxfordaqaSubject(
  contentCode: string
): ResolvedCrossBoardLink[] {
  const concepts = getMappingsForOxfordaqaSubject(contentCode)
  const seen = new Set<string>()
  const out: ResolvedCrossBoardLink[] = []

  for (const concept of concepts) {
    for (const ref of concept.refs) {
      if (ref.board !== 'cambridge' || !ref.topicCode) continue
      const key = `course|${refKey(ref)}`
      if (seen.has(key)) continue
      const href = caieCourseHref(ref)
      if (!href) continue
      seen.add(key)
      out.push({
        board: 'cambridge',
        label: ref.label ?? `${ref.syllabusOrUnit} ${ref.topicCode}`,
        href,
        syllabusOrUnit: ref.syllabusOrUnit,
        topicCode: ref.topicCode,
      })
    }
  }
  return out
}

export function resolveCaieLinksForOxfordaqaSubject(
  contentCode: string
): ResolvedCrossBoardLink[] {
  const concepts = getMappingsForOxfordaqaSubject(contentCode)
  const seen = new Set<string>()
  const out: ResolvedCrossBoardLink[] = []

  for (const concept of concepts) {
    for (const ref of concept.refs) {
      if (ref.board !== 'cambridge' || !ref.topicCode) continue
      const key = refKey(ref)
      if (seen.has(key)) continue
      const href = caieShellHref(ref)
      if (!href) continue
      seen.add(key)
      out.push({
        board: 'cambridge',
        label: ref.label ?? `${ref.syllabusOrUnit} ${ref.topicCode}`,
        href,
        syllabusOrUnit: ref.syllabusOrUnit,
        topicCode: ref.topicCode,
      })
    }
  }
  return out
}

/** Every 9709 topic code that appears in the seed with an Edexcel counterpart. */
export function listedCaie9709TopicCodes(): string[] {
  const codes = new Set<string>()
  for (const c of allConcepts()) {
    for (const r of c.refs) {
      if (r.board === 'cambridge' && r.syllabusOrUnit === '9709' && r.topicCode) {
        codes.add(r.topicCode)
      }
    }
  }
  return [...codes].sort()
}

export function expectedCaie9709TopicCodes(): string[] {
  return CAMBRIDGE_9709_SYLLABUS.map((t) => t.code)
}

export function edexcelUnitsWithCourseLinks(): string[] {
  const units = new Set<string>()
  for (const c of allConcepts()) {
    for (const r of c.refs) {
      if (r.board === 'edexcel') units.add(r.syllabusOrUnit.toUpperCase())
    }
  }
  return [...units].sort()
}
