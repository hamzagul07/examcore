import {
  getAllIbCourseLessonParams,
  getIbCourseLesson,
  getIbCourseLessons,
  getIbCourseSlugs,
} from '@/lib/courses/ib'
import type { CourseLesson } from '@/lib/courses/types'
import {
  CAIE_SURFACES,
  type CaieSurface,
  isIndexableLesson,
  lessonHasSurface,
} from '@/lib/seo/caie-graph'

export type { CaieSurface as IbSurface }
export { CAIE_SURFACES as IB_SURFACES, lessonHasSurface, isIndexableLesson }

export function ibLessonPath(slug: string, lessonSlug: string): string {
  return `/ib/courses/${slug}/${lessonSlug}`
}

export function ibSurfacePath(
  slug: string,
  lessonSlug: string,
  surface: CaieSurface
): string {
  return `/ib/courses/${slug}/${lessonSlug}/${surface}`
}

export function getAllIbSurfaceParams(): Array<{
  slug: string
  lesson: string
  surface: CaieSurface
}> {
  const out: Array<{ slug: string; lesson: string; surface: CaieSurface }> = []
  for (const slug of getIbCourseSlugs()) {
    for (const lesson of getIbCourseLessons(slug)) {
      if (!isIndexableLesson(lesson)) continue
      for (const surface of CAIE_SURFACES) {
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
  surface: CaieSurface
): CourseLesson | null {
  const lesson = getIbCourseLesson(slug, lessonSlug)
  if (!lesson || !isIndexableLesson(lesson) || !lessonHasSurface(lesson, surface)) {
    return null
  }
  return lesson
}

export { getAllIbCourseLessonParams }
