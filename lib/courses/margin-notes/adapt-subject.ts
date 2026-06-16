import { countCourseUnits, courseCatalogMeta } from '@/lib/courses/catalog-display'
import type { CourseSubject } from '@/lib/courses/types'
import type { MarginNotesSubject } from '@/lib/courses/margin-notes/types'
import { subjectAccent, subjectFamily, subjectGlyph } from '@/lib/courses/margin-notes/subject-meta'

export function adaptCatalogSubject(
  course: CourseSubject,
  prog = 0
): MarginNotesSubject {
  const lessons = course.publishedCount > 0 ? course.publishedCount : course.lessonCount
  const meta = courseCatalogMeta(course)
  const qMatch = meta.match(/(\d+)\s*past-paper/)
  const q = qMatch ? parseInt(qMatch[1], 10) : Math.round(lessons * 5.8)

  return {
    code: course.code,
    name: course.name,
    glyph: subjectGlyph(course.code, course.name),
    acc: subjectAccent(course.code),
    level: course.level,
    fam: subjectFamily(course.code),
    units: countCourseUnits(course.code),
    lessons,
    q,
    prog,
  }
}

export function adaptAllCatalogSubjects(
  courses: CourseSubject[],
  progressByCode: Record<string, number> = {}
): MarginNotesSubject[] {
  return courses.map((c) => adaptCatalogSubject(c, progressByCode[c.code] ?? 0))
}
