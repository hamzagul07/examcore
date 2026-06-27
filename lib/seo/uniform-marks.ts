/**
 * Raw mark → Percentage Uniform Mark (PUM / UMS) conversion — pure + testable.
 *
 * Cambridge reports a Percentage Uniform Mark on a 0–100 scale where the grade
 * thresholds map to fixed anchors (A=80, B=70, C=60, D=50, E=40), full marks = 100
 * and zero = 0. Between anchors the scale is piecewise linear, so a raw mark part
 * way through a grade band converts to a PUM part way between the two anchor PUMs.
 *
 * Note: A* (PUM 90) is awarded on the overall subject aggregate, not per component,
 * so this component-level converter uses the published A–E thresholds.
 */

export type PumGrade = 'A' | 'B' | 'C' | 'D' | 'E'
export const PUM_GRADES: PumGrade[] = ['A', 'B', 'C', 'D', 'E']

/** Fixed PUM anchor for each grade threshold. */
export const PUM_ANCHORS: Record<PumGrade, number> = { A: 80, B: 70, C: 60, D: 50, E: 40 }

export type PumBoundary = { grade: PumGrade; mark: number | '' }

export type PumResult = {
  pum: number | null
  grade: string | null
  /** PUM needed for the next grade up, and the raw marks to get there. */
  nextGrade: string | null
  marksToNext: number | null
}

type Point = { raw: number; pum: number }

/**
 * Convert a raw mark to a PUM using the entered A–E thresholds.
 * Returns null pum when there isn't enough information (no valid total/boundaries).
 */
export function rawToPum(raw: number, max: number, boundaries: PumBoundary[]): PumResult {
  if (!Number.isFinite(raw) || !Number.isFinite(max) || max <= 0) {
    return { pum: null, grade: null, nextGrade: null, marksToNext: null }
  }
  const clamped = Math.max(0, Math.min(raw, max))

  // Build the anchor points: (0,0), each provided threshold, (max,100).
  const points: Point[] = [{ raw: 0, pum: 0 }]
  for (const g of PUM_GRADES) {
    const b = boundaries.find((x) => x.grade === g)
    if (b && b.mark !== '' && Number.isFinite(Number(b.mark))) {
      points.push({ raw: Number(b.mark), pum: PUM_ANCHORS[g] })
    }
  }
  points.push({ raw: max, pum: 100 })

  // Sort + dedupe by raw, keep monotonic-ish ascending.
  const sorted = points
    .filter((p) => p.raw >= 0 && p.raw <= max)
    .sort((a, b) => a.raw - b.raw)
  const uniq: Point[] = []
  for (const p of sorted) {
    if (uniq.length && uniq[uniq.length - 1].raw === p.raw) continue
    uniq.push(p)
  }
  if (uniq.length < 2) return { pum: null, grade: null, nextGrade: null, marksToNext: null }

  // Piecewise-linear interpolation.
  let pum = 100
  for (let i = 0; i < uniq.length - 1; i++) {
    const a = uniq[i]
    const b = uniq[i + 1]
    if (clamped >= a.raw && clamped <= b.raw) {
      const span = b.raw - a.raw
      pum = span === 0 ? b.pum : a.pum + ((clamped - a.raw) / span) * (b.pum - a.pum)
      break
    }
  }
  pum = Math.round(pum)

  // Grade = highest threshold the raw mark meets.
  let grade: string | null = null
  let nextGrade: string | null = null
  let marksToNext: number | null = null
  const ladder = PUM_GRADES.map((g) => ({
    g,
    mark: boundaries.find((x) => x.grade === g)?.mark,
  })).filter((x): x is { g: PumGrade; mark: number } => x.mark !== '' && Number.isFinite(Number(x.mark)))
    .map((x) => ({ g: x.g, mark: Number(x.mark) }))

  for (const rung of ladder) {
    if (clamped >= rung.mark) {
      grade = rung.g
      break
    }
  }
  // Find the next grade up (the lowest-mark rung above the current raw).
  const above = ladder.filter((r) => r.mark > clamped).sort((a, b) => a.mark - b.mark)[0]
  if (above) {
    nextGrade = above.g
    marksToNext = above.mark - clamped
  }

  return { pum, grade: grade ?? (ladder.length ? 'U' : null), nextGrade, marksToNext }
}
