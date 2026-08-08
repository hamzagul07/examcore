import type { ExamSystem } from '@/lib/exam-systems/types'

/**
 * AP / College Board — stub (Phase E6).
 * Own lifecycle surfaces (FRQ, score calculators) — not A-Level results day.
 */
export const apExamSystem: ExamSystem = {
  id: 'ap',
  label: 'AP (College Board)',
  shortLabel: 'AP',
  profileBoardId: 'AP',
  enabled: false,
  markingEnabled: false,
  routePrefix: 'ap',
  qualifications: [
    {
      id: 'ap-course',
      label: 'AP Course',
      slug: 'courses',
      shellEnabled: false,
      markingEnabled: false,
    },
  ],
  gradeModel: 'ap_1_to_5',
  markingDialect: 'earned_point',
  assessmentStyle: 'ap_course',
  markPickerHint: 'FRQ scoring guidelines & 1–5 projection — coming soon',
  ownsSubjectCode() {
    return false
  },
  contentSubjectCode(code) {
    const trimmed = code.trim()
    return trimmed.startsWith('ap-') ? trimmed : `ap-${trimmed}`
  },
  catalogSubjectSlug(code) {
    const trimmed = code.trim()
    return trimmed.startsWith('ap-') ? trimmed.slice(3) : trimmed
  },
  boardLabel(code) {
    return `AP ${code.trim().replace(/^ap-/i, '')}`
  },
}
