import { isOxfordaqaContentCode } from '@/lib/oxfordaqa/catalog'
import { isOxfordaqaMarkingLive } from '@/lib/oxfordaqa/marking'
import type { ExamSystem } from '@/lib/exam-systems/types'

/**
 * OxfordAQA International — shell + Wave 1 STEM marking (product override).
 */
export const oxfordaqaExamSystem: ExamSystem = {
  id: 'oxfordaqa',
  label: 'OxfordAQA',
  shortLabel: 'OxfordAQA',
  profileBoardId: 'OxfordAQA',
  enabled: true,
  markingEnabled: isOxfordaqaMarkingLive(),
  routePrefix: 'oxfordaqa',
  qualifications: [
    {
      id: 'international-a-level',
      label: 'International A-level',
      slug: 'international-a-level',
      shellEnabled: true,
      markingEnabled: isOxfordaqaMarkingLive(),
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
  markPickerHint: "IAL Maths, Physics, Chemistry & Biology — marked in OxfordAQA's own codes",
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
