import 'server-only'

import { getIbCourse } from '@/lib/courses/ib'
import { getIbSubject } from '@/lib/ib/catalog'
import { ibCourseContentSlug } from '@/lib/ib/slug-resolve'

export type IbCourseSibling = {
  catalogSlug: string
  courseSlug: string
  name: string
  level: string
  path: string
}

/** HL ↔ SL course pair when both exist on disk. */
export function getIbCourseSibling(slug: string): IbCourseSibling | null {
  const courseSlug = ibCourseContentSlug(slug)
  let siblingCourseSlug: string | null = null

  if (courseSlug.endsWith('-hl')) {
    siblingCourseSlug = courseSlug.replace(/-hl$/, '-sl')
  } else if (courseSlug.endsWith('-sl')) {
    siblingCourseSlug = courseSlug.replace(/-sl$/, '-hl')
  }

  if (!siblingCourseSlug || siblingCourseSlug === courseSlug) return null

  const course = getIbCourse(siblingCourseSlug)
  if (!course) return null

  const subject = getIbSubject(course.ibSlug)
  if (!subject) return null

  return {
    catalogSlug: course.ibSlug,
    courseSlug: course.code,
    name: subject.name,
    level: subject.level,
    path: course.path,
  }
}
