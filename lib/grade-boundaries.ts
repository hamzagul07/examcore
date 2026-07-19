/**
 * Cambridge International A-Level Mathematics 9709 grade boundaries.
 *
 * Real boundaries shift session-to-session (a "soft" paper might push A* up to
 * 65/75 = 87%, an unusually hard one might drop it to 55/75 = 73%). For the
 * progress trajectory we display % thresholds instead of raw mark counts so the
 * same chart works across papers with /50 and /75 mark scales.
 *
 * Per-paper raw boundaries we averaged across (June 2019-2023 series):
 *   P1 (/75): A*=60, A=53, B=45, C=37, D=30, E=22
 *   P2 (/50): A*=42, A=37, B=31, C=25, D=20, E=15
 *   P3 (/75): A*=58, A=51, B=43, C=35, D=28, E=21
 *   P4 (/50): A*=40, A=35, B=29, C=24, D=19, E=14
 *   P5 (/50): A*=42, A=37, B=31, C=25, D=20, E=15
 *   P6 (/50): A*=40, A=35, B=29, C=24, D=19, E=14
 *
 * Averaged to clean round-numbers below; the trade-off is we slightly under-
 * call A* on /75 papers (where 80% ≈ 60/75 = the actual boundary) and slightly
 * over-call on /50 mechanics (real A* ≈ 80%). Acceptable for a guidance UI.
 */

export type GradeLetter = 'A*' | 'A' | 'B' | 'C' | 'D' | 'E' | 'U'

export interface GradeBoundary {
  grade: GradeLetter
  /** Lower bound (inclusive) for this grade as a percentage 0-100. */
  percentage: number
  /** Hex color used in the trajectory chart + predictive grade card. */
  color: string
}

export const GRADE_BOUNDARIES: GradeBoundary[] = [
  { grade: 'A*', percentage: 80, color: 'var(--ec-brand, #bb2a25)' },
  { grade: 'A', percentage: 70, color: 'var(--ec-score-high, #2f6b4f)' },
  { grade: 'B', percentage: 60, color: 'var(--ec-score-mid, #84cc16)' },
  { grade: 'C', percentage: 50, color: '#eab308' },
  { grade: 'D', percentage: 40, color: '#f97316' },
  { grade: 'E', percentage: 30, color: 'var(--ec-error, #ef4444)' },
]

const UNGRADED: GradeBoundary = {
  grade: 'U',
  percentage: 0,
  color: 'var(--ec-text-secondary, #94a3b8)',
}

/**
 * Map a raw percentage (0-100) to the highest grade boundary the student has
 * cleared. Returns 'U' (slate) if below E.
 */
export function predictGradeFromPercentage(pct: number): GradeBoundary {
  for (const boundary of GRADE_BOUNDARIES) {
    if (pct >= boundary.percentage) return boundary
  }
  return UNGRADED
}

/**
 * The next grade above `current`. Used to phrase "convert X to push toward A*"
 * style tips. Returns null when already at A* (nothing higher to chase).
 */
export function getNextGrade(current: GradeLetter): GradeLetter | null {
  const order: GradeLetter[] = ['U', 'E', 'D', 'C', 'B', 'A', 'A*']
  const idx = order.indexOf(current)
  if (idx === -1 || idx === order.length - 1) return null
  return order[idx + 1]
}

/**
 * How many more marks on THIS question would lift the student to the next grade
 * band, and which grade that is. Powers the "2 marks from an A*" trajectory line.
 * Returns null when the total is unknown, they're already at the top band, or
 * they're already inside the next band (nothing to chase). Percentage-based, so
 * it works across /50 and /75 papers — see the boundary caveat at the top.
 */
export function marksToNextGrade(
  marksEarned: number,
  totalMarks: number
): { nextGrade: GradeLetter; marksNeeded: number } | null {
  if (!(totalMarks > 0) || marksEarned >= totalMarks) return null
  const pct = (marksEarned / totalMarks) * 100
  const current = predictGradeFromPercentage(pct).grade
  const next = getNextGrade(current)
  if (!next) return null
  const nextBoundary = GRADE_BOUNDARIES.find((b) => b.grade === next)
  if (!nextBoundary) return null
  const marksNeeded =
    Math.ceil((nextBoundary.percentage / 100) * totalMarks) - marksEarned
  if (marksNeeded <= 0 || marksNeeded > totalMarks - marksEarned) return null
  return { nextGrade: next, marksNeeded }
}
