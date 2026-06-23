import { getCourseCatalog, getCourseLessons } from '@/lib/courses'
import { ibContinueCatalogEntries } from '@/lib/courses/ib-catalog-display'
import type { ContinueCatalogEntry } from '@/lib/courses/margin-notes/continue-learning'

/** Server-only: lesson metadata for client continue-learning strip. */
export function buildContinueCatalog(): ContinueCatalogEntry[] {
  const cambridge = getCourseCatalog().map((course) => {
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
  return [...cambridge, ...ibContinueCatalogEntries()]
}
