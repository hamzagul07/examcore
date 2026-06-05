import fs from 'fs'
import path from 'path'
import { getSyllabusByCode, getSyllabusSubjectName, hasSyllabusTree } from '@/lib/syllabi'
import { getMarkingSubjectPages } from '@/lib/seo/programmatic-subjects'
import { getSubjectGuideSlugForCode } from '@/lib/seo/subject-guides'
import { buildOutlineLesson } from '@/lib/courses/outline'
import { topicToLessonSlug } from '@/lib/courses/slug'
import type { CourseLesson, CourseSubject } from '@/lib/courses/types'

const COURSES_DIR = path.join(process.cwd(), 'content', 'courses')

/** Subjects with syllabus trees eligible for free courses. */
export function getCourseSubjectCodes(): string[] {
  const fromMarking = getMarkingSubjectPages()
    .map((s) => s.code)
    .filter((code) => hasSyllabusTree(code))
  return [...new Set(fromMarking)].sort()
}

function publishedLessonPath(subjectCode: string, slug: string): string {
  return path.join(COURSES_DIR, subjectCode, `${slug}.json`)
}

function loadPublishedLesson(
  subjectCode: string,
  slug: string
): CourseLesson | null {
  const filePath = publishedLessonPath(subjectCode, slug)
  if (!fs.existsSync(filePath)) return null
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as CourseLesson
    if (!raw.slug || !raw.topicCode) return null
    return {
      ...raw,
      status: raw.status === 'premium' ? 'premium' : 'published',
    }
  } catch {
    return null
  }
}

export function getCourseSubject(code: string): CourseSubject | null {
  const topics = getSyllabusByCode(code)
  const name = getSyllabusSubjectName(code)
  if (!topics?.length || !name) return null

  const marking = getMarkingSubjectPages().find((s) => s.code === code)
  const lessons = getCourseLessons(code)
  const publishedCount = lessons.filter(
    (l) => l.status === 'published' || l.status === 'premium'
  ).length

  return {
    code,
    name,
    level: marking?.levels.includes('A-Level')
      ? 'A-Level'
      : marking?.levels.includes('O-Level')
        ? 'O-Level'
        : 'Cambridge',
    lessonCount: lessons.length,
    publishedCount,
    path: `/courses/${code}`,
  }
}

export function getCourseCatalog(): CourseSubject[] {
  return getCourseSubjectCodes()
    .map((code) => getCourseSubject(code))
    .filter((s): s is CourseSubject => s !== null)
}

export function getCourseLessons(subjectCode: string): CourseLesson[] {
  const topics = getSyllabusByCode(subjectCode)
  const name = getSyllabusSubjectName(subjectCode)
  if (!topics?.length || !name) return []

  const guideSlug = getSubjectGuideSlugForCode(subjectCode)

  return topics.map((topic) => {
    const slug = topicToLessonSlug(topic.code, topic.name)
    const published = loadPublishedLesson(subjectCode, slug)
    if (published) {
      return published
    }
    const outline = buildOutlineLesson(subjectCode, name, topic)
    if (guideSlug) {
      const resources = outline.sections.find((s) => s.type === 'resources')
      if (resources && resources.type === 'resources') {
        resources.items[0] = {
          label: `${subjectCode} past paper guide`,
          href: `/blog/${guideSlug}`,
        }
      }
    }
    return outline
  })
}

export function getCourseLesson(
  subjectCode: string,
  lessonSlug: string
): CourseLesson | null {
  return getCourseLessons(subjectCode).find((l) => l.slug === lessonSlug) ?? null
}

export function getAllCourseLessonPaths(): { code: string; slug: string }[] {
  const paths: { code: string; slug: string }[] = []
  for (const code of getCourseSubjectCodes()) {
    for (const lesson of getCourseLessons(code)) {
      paths.push({ code, slug: lesson.slug })
    }
  }
  return paths
}
