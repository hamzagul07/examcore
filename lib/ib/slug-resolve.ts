import { getIbSubject } from '@/lib/ib/catalog'

/**
 * IB catalog slugs (past papers / subjects) and course folder slugs are the same
 * string for every subject today (e.g. `environmental-systems-and-societies-sl`).
 * Helpers normalize either form to the canonical slug used in routes and content.
 */

/** Course content folder slug — pass catalog or course slug. */
export function ibCourseContentSlug(slug: string): string {
  return slug
}

/** IB catalog / past-papers / subjects slug — pass catalog or course slug. */
export function ibCatalogSlug(slug: string): string {
  return slug
}

/** Resolve catalog slug to a registered IB subject, if any. */
export function ibSubjectForSlug(slug: string) {
  return getIbSubject(ibCatalogSlug(slug))
}

/** URL path for an IB course hub — pass catalog or course folder slug. */
export function ibCoursePath(slug: string): string {
  return `/ib/courses/${ibCourseContentSlug(slug)}`
}

/** Lesson URL under an IB course — pass catalog or course folder slug. */
export function ibCourseLessonPath(slug: string, lessonSlug: string): string {
  return `${ibCoursePath(slug)}/${lessonSlug}`
}
