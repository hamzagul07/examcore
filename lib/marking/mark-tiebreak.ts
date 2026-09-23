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

type CriterionRow = { criterion?: unknown; marks_awarded?: unknown }

/** Per-criterion marks keyed by upper-cased criterion id; null when unreadable. */
export function criterionMarks(value: unknown): Map<string, number> | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const out = new Map<string, number>()
  for (const entry of value as CriterionRow[]) {
    if (!entry || typeof entry !== 'object') return null
    const key = typeof entry.criterion === 'string' ? entry.criterion.trim().toUpperCase() : ''
    const marks = entry.marks_awarded
    if (!key || typeof marks !== 'number' || !Number.isFinite(marks)) return null
    out.set(key, marks)
  }
  return out
}

/**
 * The largest disagreement between two passes on any single criterion. Two
 * essays can agree on the total while one objective flips two levels and
 * another flips back: measured on an examiner-marked 20-mark essay, the
 * evaluation objective moved between 1/7 and 7/7 across runs of identical
 * text. The total hides that; the per-objective view does not.
 */
export function maxCriterionDelta(
  first: unknown,
  verify: unknown
): number | null {
  const a = criterionMarks(first)
  const b = criterionMarks(verify)
  if (!a || !b) return null
  let max = 0
  for (const [key, marks] of a) {
    const other = b.get(key)
    if (typeof other !== 'number') return null
    max = Math.max(max, Math.abs(marks - other))
  }
  return max
}

export function needsTiebreak(input: {
  style: string | null | undefined
  firstMarks: number | null | undefined
  verifyMarks: number | null | undefined
  /** criteria_results of each pass, when the style marks per objective. */
  firstCriteria?: unknown
  verifyCriteria?: unknown
}): TiebreakDecision {
  const a = input.firstMarks
  const b = input.verifyMarks
  if (!Number.isFinite(a as number) || !Number.isFinite(b as number)) {
    return { needed: false, delta: 0 }
  }
  const totalDelta = Math.abs((a as number) - (b as number))
  const perCriterion = maxCriterionDelta(input.firstCriteria, input.verifyCriteria)
  const delta = Math.max(totalDelta, perCriterion ?? 0)
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

type CriteriaPayload = Record<string, unknown> & { criteria_results?: unknown }

/**
 * Settle a per-objective result objective by objective.
 *
 * With one median over totals, an essay whose evaluation objective flipped
 * between Level 1 and Level 3 across passes could still land on either extreme
 * whenever the other objectives moved the other way. Taking the median of each
 * objective's three marks, and carrying that objective's own justification
 * from the pass that gave it, damps the flip without the defect the file
 * header warns about: every objective's reasoning still argues for the mark
 * shown beside it. The overall narrative comes from the pass whose total is
 * nearest the merged sum, so the summary reads as one examiner's view.
 *
 * Falls back to the whole-candidate median when the three passes do not
 * share the same criterion set. The caller reconciles the merged payload so
 * the totals are recomputed in code, as for any other result.
 */
export function mergeMedianByCriterion<T extends CriteriaPayload>(
  candidates: [MarkCandidate<T>, MarkCandidate<T>, MarkCandidate<T>]
): { payload: T; merged: boolean; perCriterion: Record<string, [number, number, number]> } {
  const maps = candidates.map((c) => criterionMarks(c.payload.criteria_results))
  const keys = maps[0] ? [...maps[0].keys()] : []
  const shared =
    maps.every((m) => m !== null) &&
    keys.length > 0 &&
    maps.every((m) => m!.size === keys.length && keys.every((k) => m!.has(k)))
  if (!shared) {
    return { payload: pickMedianCandidate(candidates).payload, merged: false, perCriterion: {} }
  }
  const perCriterion: Record<string, [number, number, number]> = {}
  const chosenRows: Array<Record<string, unknown>> = []
  let sum = 0
  for (const key of keys) {
    const marks = maps.map((m) => m!.get(key) as number) as [number, number, number]
    const median = medianOfThree(marks[0], marks[1], marks[2])
    const from = marks.findIndex((m) => m === median)
    const rows = candidates[from].payload.criteria_results as Array<Record<string, unknown>>
    const row = rows.find(
      (r) => typeof r.criterion === 'string' && r.criterion.trim().toUpperCase() === key
    )!
    chosenRows.push({ ...row })
    perCriterion[key] = marks
    sum += median
  }
  const base = candidates.reduce((best, c) =>
    Math.abs(c.marks - sum) < Math.abs(best.marks - sum) ? c : best
  )
  const merged: Record<string, unknown> = { ...base.payload, criteria_results: chosenRows, marks_earned: sum }
  if (merged.band_result && typeof merged.band_result === 'object') {
    merged.band_result = { ...(merged.band_result as Record<string, unknown>), marks_awarded: sum }
  }
  return { payload: merged as T, merged: true, perCriterion }
}
