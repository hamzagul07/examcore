/**
 * Deterministic mark reconciliation.
 *
 * The marking model authors its own `total_marks` / `marks_earned` numbers, and
 * for criterion questions it is merely *asked* to sum the per-criterion marks
 * (prompts.ts). Models get this arithmetic wrong: totals diverge from the
 * breakdown, criterion marks exceed their band maximum, and the headline mark
 * disagrees with what the student sees per criterion.
 *
 * This module is the single place that makes the numbers trustworthy. The model
 * may JUDGE (which band, is a method valid); it must never OWN arithmetic. After
 * a marking response is parsed, we:
 *   - fix the denominator from an authoritative source (official scheme total,
 *     catalogued IB component max, or the student-supplied total) — never the
 *     model's guess,
 *   - clamp each criterion award to its real band maximum,
 *   - recompute `marks_earned` as the sum of the breakdown, and
 *   - keep the top-level number, band roll-up and per-criterion detail mutually
 *     consistent.
 *
 * Pure and side-effect free (mutates + returns the passed object for ergonomics).
 */

export type CriterionMax = { letter: string; maxMarks: number }

export type ReconcileOptions = {
  /**
   * The correct denominator when the system knows it: official scheme total,
   * catalogued IB component max, or student-supplied total. Null/0 = unknown,
   * in which case we fall back to the breakdown's own totals.
   */
  authoritativeTotal?: number | null
  /**
   * Authoritative per-criterion maxima (from the IB catalog). When present these
   * override whatever `marks_available` the model emitted, so criterion clamping
   * and the summed total are exact rather than model-reported.
   */
  criterionMax?: CriterionMax[] | null
}

type AnyRecord = Record<string, unknown>

function num(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.max(min, Math.min(value, max))
}

function normalizeLetter(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

/**
 * Reconcile a parsed marking result in place. Safe to call on any marking
 * payload shape (points, level-of-response, IB criteria) — it routes on the
 * fields present and leaves an unrecognised shape untouched apart from a final
 * earned/total clamp.
 */
export function reconcileMarkResult<T extends AnyRecord>(
  result: T,
  opts: ReconcileOptions = {}
): T {
  if (!result || typeof result !== 'object') return result

  const authoritative =
    typeof opts.authoritativeTotal === 'number' && opts.authoritativeTotal > 0
      ? opts.authoritativeTotal
      : null

  const criteria = Array.isArray(result.criteria_results)
    ? (result.criteria_results as AnyRecord[])
    : null

  if (criteria && criteria.length > 0) {
    reconcileCriteria(result, criteria, authoritative, opts.criterionMax ?? null)
  } else if (result.band_result && typeof result.band_result === 'object') {
    reconcileBand(result, result.band_result as AnyRecord, authoritative)
  } else {
    reconcilePoints(result, authoritative)
  }

  // Final safety net: earned never negative, never above total.
  const net = result as AnyRecord
  const total = num(net.total_marks)
  const earned = num(net.marks_earned)
  if (total !== null && total > 0 && earned !== null) {
    net.marks_earned = clamp(earned, 0, total)
  } else if (earned !== null && earned < 0) {
    net.marks_earned = 0
  }

  return result
}

/** IB / multi-criterion: per-criterion clamp, summed earned, exact total. */
function reconcileCriteria(
  result: AnyRecord,
  criteria: AnyRecord[],
  authoritative: number | null,
  criterionMax: CriterionMax[] | null
): void {
  if (criterionMax && criterionMax.length > 0) {
    reconcileCriteriaAgainstCatalog(result, criteria, criterionMax)
    return
  }

  // No catalog: drive the total from what the model reported (best effort).
  let sumAvailable = 0
  let sumEarned = 0
  let sawAvailable = false

  for (const c of criteria) {
    const available = num(c.marks_available)
    if (available !== null && available >= 0) {
      c.marks_available = available
      sumAvailable += available
      sawAvailable = true
      c.marks_awarded = clamp(num(c.marks_awarded) ?? 0, 0, available)
      sumEarned += c.marks_awarded as number
    } else {
      const awarded = Math.max(0, num(c.marks_awarded) ?? 0)
      c.marks_awarded = awarded
      sumEarned += awarded
    }
  }

  const total =
    authoritative ??
    (sawAvailable ? sumAvailable : num(result.total_marks) ?? sumEarned)
  const earned = clamp(sumEarned, 0, total > 0 ? total : sumEarned)

  result.total_marks = total
  result.marks_earned = earned
  syncBand(result, earned, total)
}

/**
 * M4: the catalog is authoritative. Drive the denominator from EVERY catalog
 * criterion (not just the ones the model returned), pull each award from the
 * model's matching result (0 if omitted), clamp to the catalog max, and drop any
 * model criterion whose letter isn't in the catalog (so it can't inflate either
 * side). Zero-filled criteria are surfaced so the breakdown reflects the real
 * component.
 */
function reconcileCriteriaAgainstCatalog(
  result: AnyRecord,
  criteria: AnyRecord[],
  criterionMax: CriterionMax[]
): void {
  const resultByLetter = new Map(
    criteria.map((c) => [normalizeLetter(c.criterion ?? c.letter), c])
  )

  let sumAvailable = 0
  let sumEarned = 0
  const rebuilt: AnyRecord[] = []

  for (const { letter, maxMarks } of criterionMax) {
    const key = normalizeLetter(letter)
    sumAvailable += maxMarks
    const c = resultByLetter.get(key)
    if (c) {
      const awarded = clamp(num(c.marks_awarded) ?? 0, 0, maxMarks)
      c.marks_available = maxMarks
      c.marks_awarded = awarded
      sumEarned += awarded
      rebuilt.push(c)
    } else {
      // Catalog criterion the model didn't address — count its max in the
      // denominator, award 0, and show it in the breakdown.
      rebuilt.push({
        criterion: letter,
        criterion_name: '',
        level: 0,
        marks_awarded: 0,
        marks_available: maxMarks,
        band_descriptor: '',
        justification: 'Not addressed in the response.',
      })
    }
  }

  result.criteria_results = rebuilt
  const total = sumAvailable
  const earned = clamp(sumEarned, 0, total)
  result.total_marks = total
  result.marks_earned = earned
  syncBand(result, earned, total)
}

/** Keep the holistic band roll-up consistent with the criterion sum. */
function syncBand(result: AnyRecord, earned: number, total: number): void {
  if (result.band_result && typeof result.band_result === 'object') {
    const band = result.band_result as AnyRecord
    band.marks_awarded = earned
    band.marks_available = total
  }
}

/** Level-of-response: earned == the band mark, clamped to the real total. */
function reconcileBand(
  result: AnyRecord,
  band: AnyRecord,
  authoritative: number | null
): void {
  const modelScale = num(band.marks_available) ?? num(result.total_marks)
  const total = authoritative ?? modelScale ?? 0
  const bandMark = num(band.marks_awarded) ?? num(result.marks_earned) ?? 0

  let earned: number
  if (total <= 0) {
    earned = Math.max(0, bandMark)
  } else if (
    authoritative !== null &&
    modelScale !== null &&
    modelScale > authoritative
  ) {
    // Same fabricated-perfect problem as reconcilePoints (M3): the model marked
    // a band mark against a LARGER scale than the real total, so clamping (e.g.
    // 12 on a 15-mark scale, real total 9) would show 9/9 = 100%. Preserve the
    // model's ratio on the real total instead.
    earned = clamp(Math.round((bandMark * authoritative) / modelScale), 0, total)
  } else {
    earned = clamp(bandMark, 0, total)
  }

  band.marks_available = total
  band.marks_awarded = earned
  result.total_marks = total
  result.marks_earned = earned
}

/**
 * Point-based / general: fix only the denominator from the authoritative source
 * and clamp earned. Cambridge point codes can be worth >1 mark each, so we do
 * NOT recompute earned by counting entries here — that would change established
 * point-marking semantics. The earned value is clamped by the caller's final net.
 */
function reconcilePoints(result: AnyRecord, authoritative: number | null): void {
  if (authoritative === null) return

  // M3: if the model marked against a LARGER total than the authoritative one
  // (e.g. it scored 5/10 but the real total is 5), a plain clamp would show a
  // fabricated perfect ("5/5"). Preserve the model's ratio on the real total.
  //
  // This must apply to the WHOLE region where the model over-stated the total,
  // not only when earned exceeds the authoritative total. Guarding on
  // `earned > authoritative` was a bug: it left 5/10 as 5/5 (100%) while scaling
  // 6/10 to 3/5 (60%) — a non-monotonic score that DROPS as the student earns
  // more. The asymmetry is intentional: we only scale when the model over-stated
  // the total (marked on an inflated scale). When it under-stated, the earned
  // points are real discrete awards on the true scale, so they are kept as-is.
  const modelTotal = num(result.total_marks)
  const earned = num(result.marks_earned)
  result.total_marks = authoritative
  if (
    earned !== null &&
    modelTotal !== null &&
    modelTotal > authoritative
  ) {
    result.marks_earned = clamp(
      Math.round((earned * authoritative) / modelTotal),
      0,
      authoritative
    )
  }
}
