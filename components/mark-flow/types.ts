/**
 * Mark flow v2 draft contract (R1 / Phase 2).
 * Capture/Confirm own draft fields; host maps files + submit onto classic `/mark` APIs.
 */

import type { MarkExamBoard } from '@/components/mark/MarkBoardPicker'

export type MarkFlowState = 'capture' | 'confirm' | 'marking' | 'result'

export type MarkScope = 'one_answer' | 'whole_paper'

export type MarkInputKind = 'typed' | 'photos' | 'pdf'

/** One-answer: homework/practice vs official past-paper lookup. */
export type MarkQuestionSource = 'practice' | 'past_paper'

/**
 * When questionSource is practice: separate question + working vs one scanned
 * sheet (classic mark_intent combined_script).
 */
export type MarkPracticeKind = 'separate' | 'combined_script'

export type MarkFlowDraft = {
  scope: MarkScope
  board: MarkExamBoard
  subjectCode: string | null
  /** One-answer question source (Cambridge past paper vs my own question). */
  questionSource: MarkQuestionSource
  /** Practice layout — ignored for past_paper / whole_paper. */
  practiceKind: MarkPracticeKind
  /** Past-paper catalog ref, or null for “my own question”. */
  paperKey: string | null
  /** Whole-paper / past-paper: e.g. 9709/12 */
  paperCode: string | null
  /** Whole-paper / past-paper: e.g. May/June 2024 */
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
    board: (partial?.board ?? 'cambridge') as MarkExamBoard,
    subjectCode: partial?.subjectCode ?? null,
    questionSource: 'practice',
    practiceKind: 'separate',
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

/** Honest duration copy — ranges, not stopwatches. */
export const MARK_FLOW_DURATION_SINGLE = 'about a minute'
export const MARK_FLOW_DURATION_PAPER = 'several minutes'
