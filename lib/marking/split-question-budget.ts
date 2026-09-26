/**
 * How many of a scanned script's questions may be marked.
 *
 * Two bounds, and it matters which one bit:
 *
 *  - a HARD cap on fan-out (15 signed in, 3 for a guest) — bounds Gemini Pro
 *    spend and the route's wall-clock budget;
 *  - the caller's marking ALLOWANCE — what the gate reserved plus what is left
 *    this period plus any credits.
 *
 * The allowance used to bound only the LEDGER: the pipeline marked every
 * question up to the hard cap, then recordExtraMarkUsages refused to write
 * usage rows for the ones beyond the cap. A free user at 4/5 uploading a
 * 15-question script got 15 marks, each derived, marked and (when paid)
 * verified on Gemini Pro, for one mark of allowance — and could repeat it
 * while one mark remained. (Code review 2026-09-25, §2 "extra-question
 * charges bypass the cap".) Consumption is now bounded where the work
 * happens: the split is cut to the allowance BEFORE marking.
 *
 * Pure so the arithmetic — especially which cut is reported as what — is a
 * unit test.
 */
export type SplitQuestionBudget = {
  /** Questions that will be marked. */
  marked: number
  /** Dropped by the hard fan-out cap; would be dropped whatever the allowance. */
  sizeCut: number
  /** Dropped because the allowance could not cover them. */
  allowanceCut: number
}

export function splitQuestionBudget(input: {
  /** Distinct questions the splitter found. */
  detected: number
  /** Fan-out cap for this caller (signed in vs guest). */
  hardCap: number
  /**
   * Questions the allowance covers, or null when it does not bound (guests,
   * warn/off enforcement). Clamped to at least 1: the up-front reservation
   * already paid for one question.
   */
  maxQuestions: number | null | undefined
}): SplitQuestionBudget {
  const detected = Math.max(0, Math.floor(input.detected))
  const hardCap = Math.max(1, Math.floor(input.hardCap))
  const withinSize = Math.min(detected, hardCap)
  const sizeCut = detected - withinSize

  const allowanceCap =
    input.maxQuestions == null || !Number.isFinite(input.maxQuestions)
      ? Number.POSITIVE_INFINITY
      : Math.max(1, Math.floor(input.maxQuestions))
  const marked = Math.min(withinSize, allowanceCap)
  const allowanceCut = withinSize - marked

  return { marked, sizeCut, allowanceCut }
}
