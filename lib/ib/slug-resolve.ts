import { getIbSubject } from '@/lib/ib/catalog'

/**
 * IB catalog slugs (past papers / subjects) vs course folder slugs can differ when a
 * subject is SL-only in the catalog (`environmental-systems-and-societies`) but
 * lessons live under `environmental-systems-and-societies-sl`.
 */

const CATALOG_TO_COURSE: Record<string, string> = {
  'environmental-systems-and-societies': 'environmental-systems-and-societies-sl',
}

const COURSE_TO_CATALOG: Record<string, string> = {
  'environmental-systems-and-societies-sl': 'environmental-systems-and-societies',
}

/** Course content folder slug — pass catalog or course slug. */
export function ibCourseContentSlug(slug: string): string {
  if (COURSE_TO_CATALOG[slug]) return slug
  return CATALOG_TO_COURSE[slug] ?? slug
}

/** IB catalog / past-papers / subjects slug — pass catalog or course slug. */
export function ibCatalogSlug(slug: string): string {
  if (CATALOG_TO_COURSE[slug]) return slug
  return COURSE_TO_CATALOG[slug] ?? slug
}

/** Resolve catalog slug to a registered IB subject, if any. */
export function ibSubjectForSlug(slug: string) {
  return getIbSubject(ibCatalogSlug(slug))
}
