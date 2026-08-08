import type { ExamSystem } from '@/lib/exam-systems/types'

/** OxfordAQA International — stub (Phase E4). */
export const oxfordaqaExamSystem: ExamSystem = {
  id: 'oxfordaqa',
  label: 'OxfordAQA',
  shortLabel: 'OxfordAQA',
  profileBoardId: 'OxfordAQA',
  enabled: false,
  markingEnabled: false,
  routePrefix: 'oxfordaqa',
  qualifications: [
    {
      id: 'international-a-level',
      label: 'International A-level',
      slug: 'international-a-level',
      shellEnabled: false,
      markingEnabled: false,
    },
    {
      id: 'international-gcse',
      label: 'International GCSE',
      slug: 'international-gcse',
      shellEnabled: false,
      markingEnabled: false,
    },
  ],
  gradeModel: 'raw_marks',
  markingDialect: 'point_method',
  assessmentStyle: 'linear',
  markPickerHint: 'International A-level & GCSE — coming soon',
  ownsSubjectCode() {
    return false
  },
  contentSubjectCode(code) {
    return code.trim()
  },
  catalogSubjectSlug(code) {
    return code.trim().toLowerCase()
  },
  boardLabel(code) {
    return `OxfordAQA ${code.trim()}`
  },
}
