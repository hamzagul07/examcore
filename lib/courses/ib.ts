import fs from 'fs'
import path from 'path'
import type { CourseLesson, CourseSubject } from '@/lib/courses/types'
import { getIbSubject } from '@/lib/ib/catalog'

/**
 * IB Diploma course catalogue — slug-keyed, parallel to the Cambridge
 * `lib/courses/index.ts` (which is 4-digit-code-keyed; left untouched). Lessons
 * are original generated content under `content/courses/ib-{slug}/`.
 */

const COURSES_DIR = path.join(process.cwd(), 'content', 'courses')

function ibCourseDir(slug: string): string {
  return path.join(COURSES_DIR, `ib-${slug}`)
}

/** IB subject slugs that have a generated course folder with lessons. */
export function getIbCourseSlugs(): string[] {
  if (!fs.existsSync(COURSES_DIR)) return []
  return fs
    .readdirSync(COURSES_DIR)
    .filter((d) => d.startsWith('ib-') && fs.statSync(path.join(COURSES_DIR, d)).isDirectory())
    .map((d) => d.slice(3))
    .filter((slug) => getIbCourseLessons(slug).length > 0)
}

export function getIbCourseLessons(slug: string): CourseLesson[] {
  const dir = ibCourseDir(slug)
  if (!fs.existsSync(dir)) return []
  const lessons: CourseLesson[] = []
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as CourseLesson
      if (!raw.slug || !raw.topicCode) continue
      lessons.push({ ...raw, status: raw.status === 'premium' ? 'premium' : 'published' })
    } catch {
      /* skip malformed */
    }
  }
  return lessons.sort((a, b) => a.topicCode.localeCompare(b.topicCode, undefined, { numeric: true }))
}

export function getIbCourseLesson(slug: string, lessonSlug: string): CourseLesson | null {
  return getIbCourseLessons(slug).find((l) => l.slug === lessonSlug) ?? null
}

/** CourseSubject-shaped record for the IB course hub (reuses the Cambridge components). */
export function getIbCourse(slug: string): (CourseSubject & { ibSlug: string }) | null {
  const subject = getIbSubject(slug)
  if (!subject) return null
  const lessons = getIbCourseLessons(slug)
  if (!lessons.length) return null
  return {
    code: slug,
    name: subject.name,
    level: subject.level === 'HL' ? 'Higher Level' : 'Standard Level',
    lessonCount: lessons.length,
    publishedCount: lessons.length,
    path: `/ib/courses/${slug}`,
    ibSlug: slug,
  }
}

export function getAllIbCourseLessonParams(): { slug: string; lesson: string }[] {
  return getIbCourseSlugs().flatMap((slug) =>
    getIbCourseLessons(slug).map((l) => ({ slug, lesson: l.slug }))
  )
}
