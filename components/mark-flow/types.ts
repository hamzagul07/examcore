/**
 * Mark flow v2 draft contract (R1 / Phase 2).
 * Capture/Confirm own draft fields; host maps files + submit onto classic `/mark` APIs.
 */

export type MarkFlowState = 'capture' | 'confirm' | 'marking' | 'result'

export type MarkScope = 'one_answer' | 'whole_paper'

export type MarkInputKind = 'typed' | 'photos' | 'pdf'

export type MarkFlowDraft = {
  scope: MarkScope
  board: 'cambridge' | 'ib' | 'edexcel'
  subjectCode: string | null
  /** Past-paper catalog ref, or null for “my own question”. */
  paperKey: string | null
  /** Whole-paper: e.g. 9709/12 — required before confirm when scope is whole_paper. */
  paperCode: string | null
  /** Whole-paper: e.g. May/June 2024 */
  paperSession: string | null
  questionNumber: string | null
  /** One-answer: typed question stem (or empty when a question photo is attached). */
  questionText: string
  /** True when Capture holds a question photo/PDF (file lives in MarkFlow state). */
  hasQuestionPhoto: boolean
  inputKind: MarkInputKind | null
  typedAnswer: string
  /** Local file handles / preview URLs owned by the capture screen. */
  pageCount: number
  totalMarksHint: number | null
  dirty: boolean
}

export type MarkFlowContext = {
  state: MarkFlowState
  draft: MarkFlowDraft
  attemptId: string | null
  error: string | null
}

export function emptyDraft(
  partial?: Partial<Pick<MarkFlowDraft, 'board' | 'subjectCode' | 'scope'>>
): MarkFlowDraft {
  return {
    scope: partial?.scope ?? 'one_answer',
    board: partial?.board ?? 'cambridge',
    subjectCode: partial?.subjectCode ?? null,
    paperKey: null,
    paperCode: null,
    paperSession: null,
    questionNumber: null,
    questionText: '',
    hasQuestionPhoto: false,
    inputKind: null,
    typedAnswer: '',
    pageCount: 0,
    totalMarksHint: null,
    dirty: false,
  }
}
