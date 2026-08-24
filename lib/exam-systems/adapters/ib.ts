import type { ExamSystem } from '@/lib/exam-systems/types'

/**
 * IB Diploma — existing product behaviour as an adapter.
 * Owns non-numeric content/catalog slugs (biology-hl, ib-biology-hl, tok, …).
 */
export const ibExamSystem: ExamSystem = {
  id: 'ib',
  label: 'IB Diploma',
  shortLabel: 'IB',
  profileBoardId: 'IB',
  enabled: true,
  markingEnabled: true,
  routePrefix: 'ib',
  qualifications: [
    {
      id: 'diploma',
      label: 'IB Diploma (HL & SL)',
      slug: 'diploma',
      shellEnabled: true,
      markingEnabled: true,
    },
  ],
  gradeModel: 'markbands',
  markingDialect: 'criterion_bands',
  assessmentStyle: 'diploma',
  markPickerHint: 'Marked against IB criterion bands — photos, scans & PDFs',
  ownsSubjectCode(code) {
    // Anything non-numeric that is not claimed by a future explicit registry.
    // Numeric CAIE codes are never IB.
    return !/^\d+$/.test(code.trim())
  },
  contentSubjectCode(code) {
    const trimmed = code.trim()
    return trimmed.startsWith('ib-') ? trimmed : `ib-${trimmed}`
  },
  catalogSubjectSlug(code) {
    const trimmed = code.trim()
    return trimmed.startsWith('ib-') ? trimmed.slice(3) : trimmed
  },
  boardLabel() {
    return 'IB Diploma'
  },
}
