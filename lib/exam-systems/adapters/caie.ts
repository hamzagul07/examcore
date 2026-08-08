import type { ExamSystem } from '@/lib/exam-systems/types'

const CAMBRIDGE_CODE = /^\d+$/

/**
 * Cambridge International (CAIE) — existing product behaviour as an adapter.
 * Owns numeric syllabus codes (9709, 9702, …).
 */
export const caieExamSystem: ExamSystem = {
  id: 'cambridge',
  label: 'Cambridge International',
  shortLabel: 'CAIE',
  profileBoardId: 'Cambridge International',
  enabled: true,
  markingEnabled: true,
  routePrefix: 'caie',
  qualifications: [
    {
      id: 'a-level',
      label: 'A Level',
      slug: 'a-level',
      shellEnabled: true,
      markingEnabled: true,
    },
    {
      id: 'as-level',
      label: 'AS Level',
      slug: 'as-level',
      shellEnabled: true,
      markingEnabled: true,
    },
    {
      id: 'o-level',
      label: 'O Level',
      slug: 'o-level',
      shellEnabled: true,
      markingEnabled: true,
    },
    {
      id: 'igcse',
      label: 'IGCSE',
      slug: 'igcse',
      shellEnabled: true,
      markingEnabled: false,
    },
  ],
  gradeModel: 'raw_marks',
  markingDialect: 'point_method',
  assessmentStyle: 'linear',
  markPickerHint: 'Past papers, PDF uploads & B1/M1/A1 marking',
  ownsSubjectCode(code) {
    return CAMBRIDGE_CODE.test(code.trim())
  },
  contentSubjectCode(code) {
    return code.trim()
  },
  catalogSubjectSlug(code) {
    return code.trim()
  },
  boardLabel(code) {
    return `Cambridge ${code.trim()}`
  },
}
