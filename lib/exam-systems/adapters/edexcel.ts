import { isEdexcelUnitCode } from '@/lib/edexcel/catalog'
import { isEdexcelMarkingLive } from '@/lib/edexcel/marking'
import type { ExamSystem } from '@/lib/exam-systems/types'

/**
 * Pearson Edexcel — adapter (E1 shell + E2 Wave 1 STEM marking).
 * Unit codes (WMA11, WPH14, …) are owned here so they never fall through to IB.
 * Onboarding is on so mark → signup can store board=Edexcel (Maths/Physics/Chemistry units).
 */
export const edexcelExamSystem: ExamSystem = {
  id: 'edexcel',
  label: 'Pearson Edexcel',
  shortLabel: 'Edexcel',
  profileBoardId: 'Edexcel',
  enabled: true,
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
      shellEnabled: true,
      markingEnabled: isEdexcelMarkingLive(),
    },
  ],
  gradeModel: 'ums',
  markingDialect: 'point_method',
  assessmentStyle: 'modular',
  markPickerHint: "IAL Maths, Physics, Chemistry & Biology — marked with Edexcel's own method & accuracy marks",
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
