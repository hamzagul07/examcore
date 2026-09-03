import { extractTotalMarksForGate } from '@/lib/marking/question-marks'

/**
 * Freeform marks need a locked denominator before derive. Official / IB catalog
 * totals skip this gate; everything else must come from the student or the
 * question text (never invented by the model).
 */

export type QuestionTotalGateInput = {
  questionMarks?: number | null
  extractedTotal?: number | null
  hasOfficialSchemeTotal: boolean
  hasIbCatalogTotal: boolean
  marksInQuestion?: boolean
}

export type QuestionTotalGateResult =
  | { ok: true; total: number | null }
  | { ok: false; message: string }

export function resolveRequiredQuestionTotal(
  input: QuestionTotalGateInput
): QuestionTotalGateResult {
  if (input.hasOfficialSchemeTotal || input.hasIbCatalogTotal) {
    const userOrExtracted =
      (typeof input.questionMarks === 'number' && input.questionMarks > 0
        ? input.questionMarks
        : null) ??
      (typeof input.extractedTotal === 'number' && input.extractedTotal > 0
        ? input.extractedTotal
        : null)
    return { ok: true, total: userOrExtracted }
  }

  const total =
    (typeof input.questionMarks === 'number' && input.questionMarks > 0
      ? input.questionMarks
      : null) ??
    (typeof input.extractedTotal === 'number' && input.extractedTotal > 0
      ? input.extractedTotal
      : null)

  if (total) return { ok: true, total }

  return {
    ok: false,
    message: input.marksInQuestion
      ? 'We could not read the total marks from your question. Enter the total marks for this question (e.g. 18) and try again.'
      : 'Enter the total marks for this question so we mark out of the right number.',
  }
}

// ---------------------------------------------------------------------------
// Checking the promise before the wait
// ---------------------------------------------------------------------------

/**
 * "The marks are shown in the question I uploaded — read the total from there."
 *
 * That tick box is a promise, and until now it was only checked at the gate
 * above — after the work had been read. Of 23 recorded marking failures, 13
 * were a missing total and 12 of those 13 had this box ticked against a
 * question with no marks in it. The wait before being told ranged from 2
 * seconds to 184.
 *
 * Whenever the question is already TEXT, the promise is checkable immediately,
 * by the same deterministic extractor the gate uses. This says whether it is
 * certainly broken. It is deliberately one-directional: `false` means "not
 * proven broken", never "fine".
 */
export type QuestionTotalPromiseInput = {
  /** The student ticked "the marks are shown in the question". */
  marksInQuestion: boolean
  /** The question, when the form or the request already holds it as text. */
  questionText?: string | null
  /** A question photo or PDF still has to be read — the total may be in it. */
  hasQuestionImage: boolean
  /**
   * The answer upload may itself carry the printed question (the "just upload
   * my page" path, where OCR transcribes the stem alongside the working).
   */
  mayRecoverQuestionFromUpload: boolean
  /** A total the student typed. Any positive value settles it. */
  questionMarks?: number | null
  /** An official or IB-catalog total will supply the denominator. */
  hasSchemeTotal?: boolean
}

export function questionTotalPromiseIsBroken(
  input: QuestionTotalPromiseInput
): boolean {
  if (!input.marksInQuestion) return false
  if (input.hasSchemeTotal) return false
  if (typeof input.questionMarks === 'number' && input.questionMarks > 0) {
    return false
  }
  // Something we have not read yet could still carry the number.
  if (input.hasQuestionImage) return false
  if (input.mayRecoverQuestionFromUpload) return false

  const text = input.questionText?.trim() ?? ''
  // No question text and nothing left to read is a different failure — the
  // question is missing, not its marks — and it has its own message.
  if (!text) return false

  return extractTotalMarksForGate(text) === null
}

/** What to tell a student whose promise cannot come true. */
export const QUESTION_TOTAL_PROMISE_BROKEN_MESSAGE =
  'The mark total is not written in the question you typed. Enter it below (e.g. 18) and we will mark out of that.'
