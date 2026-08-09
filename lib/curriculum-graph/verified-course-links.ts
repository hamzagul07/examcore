import fs from 'fs'
import path from 'path'
import {
  resolveCourseLinksForEdexcelUnit,
  resolveCourseLinksForOxfordaqaSubject,
} from '@/lib/curriculum-graph'
import { getLessonDiagramSpec } from '@/lib/courses/diagram-specs'
import { hasLessonLiveDiagram } from '@/lib/courses/lesson-diagrams'
import { topicToLessonSlug } from '@/lib/courses/slug'
import { CAMBRIDGE_9709_SYLLABUS } from '@/lib/syllabus'
import { getSyllabusTopicByCode } from '@/lib/syllabi'

export type VerifiedBoardCourseLesson = {
  topicCode: string
  title: string
  href: string
  syllabusCode: string
  /** Live SVG / catalog diagram on the mapped course lesson. */
  hasLiveDiagram: boolean
  /** Synced diagram steps (0 if none). */
  diagramStepCount: number
  /** Interactive param sliders on the diagram. */
  hasDiagramParams: boolean
}

/** @deprecated Prefer VerifiedBoardCourseLesson — same shape. */
export type EdexcelUnitCourseLesson = VerifiedBoardCourseLesson

function lessonJsonExists(syllabusCode: string, slug: string): boolean {
  const base = path.join(process.cwd(), 'content', 'courses', syllabusCode)
  const candidates = [
    path.join(base, `${slug}.json`),
    path.join(base, 'published', `${slug}.json`),
  ]
  return candidates.some((p) => fs.existsSync(p))
}

function topicTitle(syllabusCode: string, topicCode: string, fallback: string): string {
  const fromTree = getSyllabusTopicByCode(syllabusCode, topicCode)?.name
  if (fromTree) return fromTree
  if (syllabusCode === '9709') {
    return CAMBRIDGE_9709_SYLLABUS.find((t) => t.code === topicCode)?.name ?? fallback
  }
  return fallback
}

function verifiedFromMapped(
  mapped: Array<{
    topicCode?: string | null
    syllabusOrUnit: string
    label?: string | null
  }>
): VerifiedBoardCourseLesson[] {
  const out: VerifiedBoardCourseLesson[] = []
  const seen = new Set<string>()

  for (const link of mapped) {
    const topic = link.topicCode?.trim()
    if (!topic) continue
    const syllabus = link.syllabusOrUnit.trim()
    const name = topicTitle(syllabus, topic, link.label ?? topic)
    const slug = topicToLessonSlug(topic, name)
    if (!lessonJsonExists(syllabus, slug)) continue
    const href = `/courses/${syllabus}/${slug}`
    if (seen.has(href)) continue
    seen.add(href)
    const spec = getLessonDiagramSpec(slug)
    out.push({
      topicCode: topic,
      title: name,
      href,
      syllabusCode: syllabus,
      hasLiveDiagram: hasLessonLiveDiagram(slug),
      diagramStepCount: spec?.steps?.length ?? 0,
      hasDiagramParams: (spec?.params?.length ?? 0) > 0,
    })
  }

  return out.sort((a, b) =>
    a.topicCode.localeCompare(b.topicCode, undefined, { numeric: true })
  )
}

/**
 * Graph-mapped CAIE course lessons for an Edexcel unit, existence-checked
 * against content/courses (never returns a 404 href). Legal reuse of our own
 * lesson JSON — not scraped third-party notes.
 */
export function verifiedCourseLessonsForEdexcelUnit(
  unitCode: string
): VerifiedBoardCourseLesson[] {
  return verifiedFromMapped(resolveCourseLinksForEdexcelUnit(unitCode))
}

/**
 * Graph-mapped CAIE course lessons for an OxfordAQA subject (content code).
 * Same legal reuse rules as the Edexcel unit helper.
 */
export function verifiedCourseLessonsForOxfordaqaSubject(
  contentCode: string
): VerifiedBoardCourseLesson[] {
  return verifiedFromMapped(resolveCourseLinksForOxfordaqaSubject(contentCode))
}
