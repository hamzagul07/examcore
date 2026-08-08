import { isOxfordaqaContentCode } from '@/lib/oxfordaqa/catalog'
import type { ExamSystem } from '@/lib/exam-systems/types'

/**
 * OxfordAQA International — adapter (Phase E4 shell).
 * Owns oxaqa-* content codes so they never fall through to IB.
 * Marking stays off until Edexcel Maths conversion clears expansion gates.
 */
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
      shellEnabled: true,
      markingEnabled: false,
    },
    {
      id: 'international-gcse',
      label: 'International GCSE',
      slug: 'international-gcse',
      shellEnabled: true,
      markingEnabled: false,
    },
  ],
  gradeModel: 'raw_marks',
  markingDialect: 'point_method',
  assessmentStyle: 'linear',
  markPickerHint: 'International A-level — shell live, marking after Edexcel converts',
  ownsSubjectCode(code) {
    return isOxfordaqaContentCode(code)
  },
  contentSubjectCode(code) {
    return code.trim().toLowerCase()
  },
  catalogSubjectSlug(code) {
    const trimmed = code.trim().toLowerCase()
    return trimmed.startsWith('oxaqa-') ? trimmed.slice('oxaqa-'.length) : trimmed
  },
  boardLabel(code) {
    return `OxfordAQA ${code.trim()}`
  },
}
