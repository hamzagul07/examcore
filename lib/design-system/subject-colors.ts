import { SUBJECTS } from '@/lib/profile-options'
import { getSubjectColor } from '@/lib/design-system/subject-accents'

/** @deprecated Use lib/design-system/subject-accents — kept for import compatibility. */
export { getSubjectColor } from '@/lib/design-system/subject-accents'

export function subjectColorEntries(): { code: string; color: string; label: string }[] {
  return SUBJECTS.filter((s) => s.enabled).map((s) => ({
    code: s.code,
    color: getSubjectColor(s.code),
    label: s.label,
  }))
}
