import { getCourseCatalog, getCourseLessons } from '@/lib/courses'
import type { ContinueCatalogEntry } from '@/lib/courses/margin-notes/continue-learning'

/** Server-only: lesson metadata for client continue-learning strip. */
export function buildContinueCatalog(): ContinueCatalogEntry[] {
  return getCourseCatalog().map((course) => {
    const lessons = getCourseLessons(course.code)
    return {
      code: course.code,
      name: course.name,
      lessonCount: lessons.length,
      lessons: lessons.map((l) => ({
        slug: l.slug,
        topicCode: l.topicCode,
        title: l.title,
      })),
    }
  })
}
