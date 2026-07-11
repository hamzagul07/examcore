import fs from 'fs'
import path from 'path'
import 'server-only'
import type { CourseLesson, CourseSubject } from '@/lib/courses/types'
import { ibCatalogSlug, ibCourseContentSlug, ibSubjectForSlug } from '@/lib/ib/slug-resolve'

/**
 * IB Diploma course catalogue — slug-keyed, parallel to the Cambridge
 * `lib/courses/index.ts` (which is 4-digit-code-keyed; left untouched). Lessons
 * are original generated content under `content/courses/ib-{slug}/`.
 */

const COURSES_DIR = path.join(process.cwd(), 'content', 'courses')

function ibCourseDir(slug: string): string {
  return path.join(COURSES_DIR, `ib-${slug}`)
}

/**
 * Canonical topic order from the factual syllabus (`lib/syllabi/ib-{slug}.json`),
 * keyed by topicCode → index. Lets lessons render in the order the syllabus
 * defines, rather than relying on alphanumeric code sort — needed where theme
 * letters don't sort into teaching order (e.g. Chemistry's Structure before
 * Reactivity: "R" < "S" alphabetically). Returns null if no syllabus file.
 */
function getSyllabusOrder(slug: string): Map<string, number> | null {
  const file = path.join(process.cwd(), 'lib', 'syllabi', `ib-${ibCourseContentSlug(slug)}.json`)
  if (!fs.existsSync(file)) return null
  try {
    const syllabus = JSON.parse(fs.readFileSync(file, 'utf8')) as { topics?: { code: string }[] }
    if (!Array.isArray(syllabus.topics)) return null
    const order = new Map<string, number>()
    syllabus.topics.forEach((t, i) => order.set(t.code, i))
    return order
  } catch {
    return null
  }
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
  const dir = ibCourseDir(ibCourseContentSlug(slug))
  if (!fs.existsSync(dir)) return []
  // A `<slug>.pilot.json` overrides the published `<slug>.json` (Study-Loop
  // preview), mirroring the paper-scoped pilot convention on the Cambridge side.
  const bySlug = new Map<string, { lesson: CourseLesson; pilot: boolean }>()
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue
    const pilot = f.endsWith('.pilot.json')
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as CourseLesson
      if (!raw.slug || !raw.topicCode) continue
      const existing = bySlug.get(raw.slug)
      if (existing && existing.pilot && !pilot) continue // keep pilot over published
      bySlug.set(raw.slug, {
        lesson: { ...raw, status: raw.status === 'premium' ? 'premium' : 'published' },
        pilot,
      })
    } catch {
      /* skip malformed */
    }
  }
  const lessons: CourseLesson[] = Array.from(bySlug.values(), (v) => v.lesson)
  const order = getSyllabusOrder(slug)
  return lessons.sort((a, b) => {
    if (order) {
      const ia = order.get(a.topicCode) ?? Number.MAX_SAFE_INTEGER
      const ib = order.get(b.topicCode) ?? Number.MAX_SAFE_INTEGER
      if (ia !== ib) return ia - ib
    }
    return a.topicCode.localeCompare(b.topicCode, undefined, { numeric: true })
  })
}

export function getIbCourseLesson(slug: string, lessonSlug: string): CourseLesson | null {
  return getIbCourseLessons(slug).find((l) => l.slug === lessonSlug) ?? null
}

/** Lessons for an IB catalog subject slug (e.g. past-papers / subjects pages). */
export function getIbCourseLessonsForCatalog(catalogSlug: string): CourseLesson[] {
  return getIbCourseLessons(catalogSlug)
}

/** CourseSubject-shaped record for the IB course hub (reuses the Cambridge components). */
export function getIbCourse(slug: string): (CourseSubject & { ibSlug: string }) | null {
  const courseSlug = ibCourseContentSlug(slug)
  const catalogSlug = ibCatalogSlug(slug)
  const subject = ibSubjectForSlug(slug)
  if (!subject) return null
  const lessons = getIbCourseLessons(courseSlug)
  if (!lessons.length) return null
  return {
    code: courseSlug,
    name: subject.name,
    level:
      subject.groupNumber === 7
        ? 'Core'
        : subject.level === 'HL'
          ? 'Higher Level'
          : 'Standard Level',
    lessonCount: lessons.length,
    publishedCount: lessons.length,
    path: `/ib/courses/${courseSlug}`,
    ibSlug: catalogSlug,
  }
}

export function getAllIbCourseLessonParams(): { slug: string; lesson: string }[] {
  return getIbCourseSlugs().flatMap((slug) =>
    getIbCourseLessons(slug).map((l) => ({ slug, lesson: l.slug }))
  )
}
