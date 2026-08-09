import fs from 'fs'
import path from 'path'
import { resolveCourseLinksForEdexcelUnit } from '@/lib/curriculum-graph'
import { topicToLessonSlug } from '@/lib/courses/slug'
import { CAMBRIDGE_9709_SYLLABUS } from '@/lib/syllabus'
import { getSyllabusTopicByCode } from '@/lib/syllabi'

export type EdexcelUnitCourseLesson = {
  topicCode: string
  title: string
  href: string
  syllabusCode: string
}

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

/**
 * Graph-mapped CAIE course lessons for an Edexcel unit, existence-checked
 * against content/courses (never returns a 404 href). Legal reuse of our own
 * lesson JSON — not scraped third-party notes.
 */
export function verifiedCourseLessonsForEdexcelUnit(
  unitCode: string
): EdexcelUnitCourseLesson[] {
  const mapped = resolveCourseLinksForEdexcelUnit(unitCode)
  const out: EdexcelUnitCourseLesson[] = []
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
    out.push({
      topicCode: topic,
      title: name,
      href,
      syllabusCode: syllabus,
    })
  }

  return out.sort((a, b) =>
    a.topicCode.localeCompare(b.topicCode, undefined, { numeric: true })
  )
}
