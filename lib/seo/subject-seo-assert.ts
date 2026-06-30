import { getMarkingSubjectCodes } from '@/lib/seo/programmatic-subjects'
import { getSubjectSeoProfile } from '@/lib/seo/subject-seo'

/** Ensure every live marking syllabus has an SEO profile (CI guard). */
export function assertAllMarkingSubjectsHaveSeo(): string[] {
  const missing = getMarkingSubjectCodes().filter((code) => !getSubjectSeoProfile(code))
  return missing
}
