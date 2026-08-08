import { isEdexcelUnitCode } from '@/lib/edexcel/catalog'
import { isEdexcelMarkingLive } from '@/lib/edexcel/marking'
import type { ExamSystem } from '@/lib/exam-systems/types'

/**
 * Pearson Edexcel — adapter (E1 shell + E2 Maths marking).
 * Unit codes (WMA11, WPH14, …) are owned here so they never fall through to IB.
 * Onboarding stays disabled until free→paid conversion is proven on Edexcel.
 */
export const edexcelExamSystem: ExamSystem = {
  id: 'edexcel',
  label: 'Pearson Edexcel',
  shortLabel: 'Edexcel',
  profileBoardId: 'Edexcel',
  enabled: false,
  markingEnabled: isEdexcelMarkingLive(),
  routePrefix: 'edexcel',
  qualifications: [
    {
      id: 'ial',
      label: 'International A Level',
      slug: 'international-a-level',
      shellEnabled: true,
      markingEnabled: isEdexcelMarkingLive(),
    },
    {
      id: 'igcse',
      label: 'International GCSE',
      slug: 'international-gcse',
      shellEnabled: true,
      markingEnabled: false,
    },
    {
      id: 'a-level',
      label: 'A Level (UK)',
      slug: 'a-level',
      shellEnabled: false,
      markingEnabled: false,
    },
  ],
  gradeModel: 'ums',
  markingDialect: 'point_method',
  assessmentStyle: 'modular',
  markPickerHint: 'IAL Maths units — method, accuracy & follow-through marking',
  ownsSubjectCode(code) {
    return isEdexcelUnitCode(code)
  },
  contentSubjectCode(code) {
    return code.trim().toUpperCase()
  },
  catalogSubjectSlug(code) {
    return code.trim().toLowerCase()
  },
  boardLabel(code) {
    return `Edexcel ${code.trim().toUpperCase()}`
  },
}
