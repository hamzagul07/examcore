import { isAqaContentCode } from '@/lib/aqa/catalog'
import { isAqaMarkingLive } from '@/lib/aqa/marking'
import type { ExamSystem } from '@/lib/exam-systems/types'

/** AQA UK A-level — selective Maths/Physics shell + marking (Phase E5). */
export const aqaExamSystem: ExamSystem = {
  id: 'aqa',
  label: 'AQA',
  shortLabel: 'AQA',
  profileBoardId: 'AQA',
  enabled: true,
  markingEnabled: isAqaMarkingLive(),
  routePrefix: 'aqa',
  qualifications: [
    {
      id: 'a-level',
      label: 'A-level',
      slug: 'a-level',
      shellEnabled: true,
      markingEnabled: isAqaMarkingLive(),
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
  markPickerHint: 'UK A-level Maths & Physics — method and accuracy marks',
  ownsSubjectCode(code) {
    return isAqaContentCode(code)
  },
  contentSubjectCode(code) {
    return code.trim().toLowerCase()
  },
  catalogSubjectSlug(code) {
    const trimmed = code.trim().toLowerCase()
    return trimmed.startsWith('aqa-') ? trimmed.slice(4) : trimmed
  },
  boardLabel(code) {
    return `AQA ${code.trim()}`
  },
}
