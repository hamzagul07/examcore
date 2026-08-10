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
