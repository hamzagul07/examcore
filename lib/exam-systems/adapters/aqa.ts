import type { ExamSystem } from '@/lib/exam-systems/types'

/** AQA UK — stub (Phase E5). */
export const aqaExamSystem: ExamSystem = {
  id: 'aqa',
  label: 'AQA',
  shortLabel: 'AQA',
  profileBoardId: 'AQA',
  enabled: false,
  markingEnabled: false,
  routePrefix: 'aqa',
  qualifications: [
    {
      id: 'a-level',
      label: 'A-level',
      slug: 'a-level',
      shellEnabled: false,
      markingEnabled: false,
    },
    {
      id: 'gcse',
      label: 'GCSE',
      slug: 'gcse',
      shellEnabled: false,
      markingEnabled: false,
    },
  ],
  gradeModel: 'raw_marks',
  markingDialect: 'point_method',
  assessmentStyle: 'linear',
  markPickerHint: 'UK A-level & GCSE — coming soon',
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
    return `AQA ${code.trim()}`
  },
}
