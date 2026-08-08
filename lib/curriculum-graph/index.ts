import seed9709Wma from '@/content/data/curriculum-graph/caie-9709-edexcel-wma.json'
import { CAMBRIDGE_9709_SYLLABUS } from '@/lib/syllabus'
import { topicToLessonSlug } from '@/lib/courses/slug'
import type {
  BoardTopicRef,
  CanonicalConcept,
  CurriculumGraphFile,
  ResolvedCrossBoardLink,
} from '@/lib/curriculum-graph/types'

const GRAPH_FILES: CurriculumGraphFile[] = [
  seed9709Wma as CurriculumGraphFile,
]

const CAIE_9709_HUB = '/caie/a-level/mathematics/9709'

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

function hrefForRef(ref: BoardTopicRef): string | null {
  if (ref.board === 'edexcel') {
    const unit = ref.syllabusOrUnit.toLowerCase()
    return `/edexcel/international-a-level/mathematics/${unit}`
  }
  if (ref.board === 'cambridge' && ref.syllabusOrUnit === '9709') {
    if (!ref.topicCode) return CAIE_9709_HUB
    const name =
      ref.label ??
      CAMBRIDGE_9709_SYLLABUS.find((t) => t.code === ref.topicCode)?.name ??
      ref.topicCode
    const slug = topicToLessonSlug(ref.topicCode, name)
    return `${CAIE_9709_HUB}/${slug}`
  }
  return null
}

/** Counterpart links for a CAIE topic (Edexcel units). */
export function resolveEdexcelLinksForCaieTopic(
  syllabusCode: string,
  topicCode: string
): ResolvedCrossBoardLink[] {
  const concepts = getMappingsForCaieTopic(syllabusCode, topicCode)
  const seen = new Set<string>()
  const out: ResolvedCrossBoardLink[] = []

  for (const concept of concepts) {
    for (const ref of concept.refs) {
      if (ref.board !== 'edexcel') continue
      const key = refKey(ref)
      if (seen.has(key)) continue
      const href = hrefForRef(ref)
      if (!href) continue
      seen.add(key)
      out.push({
        board: 'edexcel',
        label: ref.label ?? ref.syllabusOrUnit,
        href,
        syllabusOrUnit: ref.syllabusOrUnit.toUpperCase(),
        topicCode: ref.topicCode,
      })
    }
  }
  return out
}

/** Counterpart links for an Edexcel unit (CAIE topics / hub). */
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
      const href = hrefForRef(ref)
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
