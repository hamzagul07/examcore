import {
  getAllIbCourseLessonParams,
  getIbCourseLesson,
  getIbCourseLessons,
  getIbCourseSlugs,
} from '@/lib/courses/ib'
import type { CourseLesson } from '@/lib/courses/types'
import {
  LESSON_SURFACES,
  isIndexableLesson,
  lessonHasSurface,
  type LessonSurface,
} from '@/lib/exam-systems/surfaces'

export type IbSurface = LessonSurface
export { LESSON_SURFACES as IB_SURFACES, lessonHasSurface, isIndexableLesson }
/** @deprecated Prefer LessonSurface / LESSON_SURFACES */
export type { LessonSurface as CaieSurface }

export function ibLessonPath(slug: string, lessonSlug: string): string {
  return `/ib/courses/${slug}/${lessonSlug}`
}

export function ibSurfacePath(
  slug: string,
  lessonSlug: string,
  surface: LessonSurface
): string {
  return `/ib/courses/${slug}/${lessonSlug}/${surface}`
}

export function getAllIbSurfaceParams(): Array<{
  slug: string
  lesson: string
  surface: LessonSurface
}> {
  const out: Array<{ slug: string; lesson: string; surface: LessonSurface }> = []
  for (const slug of getIbCourseSlugs()) {
    for (const lesson of getIbCourseLessons(slug)) {
      if (!isIndexableLesson(lesson)) continue
      for (const surface of LESSON_SURFACES) {
        if (!lessonHasSurface(lesson, surface)) continue
        out.push({ slug, lesson: lesson.slug, surface })
      }
    }
  }
  return out
}

export function resolveIbSurface(
  slug: string,
  lessonSlug: string,
  surface: LessonSurface
): CourseLesson | null {
  const lesson = getIbCourseLesson(slug, lessonSlug)
  if (!lesson || !isIndexableLesson(lesson) || !lessonHasSurface(lesson, surface)) {
    return null
  }
  return lesson
}

export { getAllIbCourseLessonParams }
