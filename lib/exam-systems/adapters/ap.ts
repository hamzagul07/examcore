import { isApContentCode } from '@/lib/ap/catalog'
import { isApMarkingLive } from '@/lib/ap/marking'
import type { ExamSystem } from '@/lib/exam-systems/types'

/**
 * AP / College Board — Calculus AB + Physics 1 FRQ surfaces (Phase E6).
 * Own lifecycle — not A-Level Results Day architecture.
 */
export const apExamSystem: ExamSystem = {
  id: 'ap',
  label: 'AP (College Board)',
  shortLabel: 'AP',
  profileBoardId: 'AP',
  enabled: true,
  markingEnabled: isApMarkingLive(),
  routePrefix: 'ap',
  qualifications: [
    {
      id: 'ap-course',
      label: 'AP Course',
      slug: 'courses',
      shellEnabled: true,
      markingEnabled: isApMarkingLive(),
    },
  ],
  gradeModel: 'ap_1_to_5',
  markingDialect: 'earned_point',
  assessmentStyle: 'ap_course',
  markPickerHint: 'FRQ scoring guidelines & 1–5 projection — Calculus AB & Physics 1',
  ownsSubjectCode(code) {
    return isApContentCode(code)
  },
  contentSubjectCode(code) {
    const trimmed = code.trim().toLowerCase()
    return trimmed.startsWith('ap-') ? trimmed : `ap-${trimmed}`
  },
  catalogSubjectSlug(code) {
    const trimmed = code.trim().toLowerCase()
    return trimmed.startsWith('ap-') ? trimmed.slice(3) : trimmed
  },
  boardLabel(code) {
    return `AP ${code.trim().replace(/^ap-/i, '')}`
  },
}
