/**
 * Settle an essay mark by median instead of by whichever sample ran last.
 *
 * The second-opinion pass behaves very differently by marking style. Measured
 * over every run that recorded both passes:
 *
 *   point_based          32 runs   28 agreed   avg |Δ| 0.13   max |Δ| 1
 *   level_of_response    38 runs   13 agreed   avg |Δ| 1.71   max |Δ| 8
 *
 * On point-based questions verify is doing its job: it confirms, and when it
 * moves it moves by one mark. On essays it disagrees with the first pass two
 * times in three, 13 downward against 12 upward — a symmetry that is the
 * signature of sampling the same distribution twice, not of correcting an
 * error. Today the second sample simply wins, so an essay mark is effectively
 * "whichever draw came last", and the spread reaches 8 marks.
 *
 * A third sample and a median is the cheapest thing that actually reduces
 * variance rather than relocating it: the median of three draws is far more
 * stable than either one, and it cannot be dragged to an extreme by a single
 * bad draw — which is exactly the failure that gave one student 1/12 for work
 * worth 8.
 *
 * Only when the first two disagree materially, because 34% of essays already
 * agree and a third call on those buys nothing but latency on a mark that
 * already takes ~150 seconds.
 *
 * Pure: the sampling lives in the pipeline, the arithmetic and the decision
 * live here where they can be tested.
 */

/**
 * Marks of disagreement below which a third opinion is not worth the wait.
 *
 * One mark between two examiners on an essay is ordinary tolerance, and the
 * measured average disagreement is 1.71 — so a threshold of 2 sits just above
 * the noise floor and catches the swings that matter, including every one of
 * the large ones.
 */
export const TIEBREAK_MIN_DELTA = 2

/** Styles whose marks are a judgment rather than a count of scheme points. */
export function styleNeedsTiebreak(style: string | null | undefined): boolean {
  return style === 'level_of_response' || style === 'mixed'
}

export type TiebreakDecision = {
  needed: boolean
  /** How far apart the two passes were, for the log line. */
  delta: number
}

export function needsTiebreak(input: {
  style: string | null | undefined
  firstMarks: number | null | undefined
  verifyMarks: number | null | undefined
}): TiebreakDecision {
  const a = input.firstMarks
  const b = input.verifyMarks
  if (!Number.isFinite(a as number) || !Number.isFinite(b as number)) {
    return { needed: false, delta: 0 }
  }
  const delta = Math.abs((a as number) - (b as number))
  if (!styleNeedsTiebreak(input.style)) return { needed: false, delta }
  return { needed: delta >= TIEBREAK_MIN_DELTA, delta }
}

/** The middle value of three. */
export function medianOfThree(a: number, b: number, c: number): number {
  return Math.max(Math.min(a, b), Math.min(Math.max(a, b), c))
}

export type MarkCandidate<T> = { marks: number; payload: T }

/**
 * Pick the candidate whose mark is the median of the three.
 *
 * Returns the whole payload, not just the number, so the student reads the
 * justification that actually argued for the mark they were given. Stitching a
 * median score onto another sample's reasoning would produce feedback that
 * explains a different mark — which is the defect this file exists to stop,
 * reintroduced one layer down.
 *
 * Ties resolve to the earliest candidate holding the median value, so the
 * result is deterministic when two samples agree.
 */
export function pickMedianCandidate<T>(
  candidates: [MarkCandidate<T>, MarkCandidate<T>, MarkCandidate<T>]
): MarkCandidate<T> {
  const median = medianOfThree(
    candidates[0].marks,
    candidates[1].marks,
    candidates[2].marks
  )
  return candidates.find((c) => c.marks === median) ?? candidates[0]
}
