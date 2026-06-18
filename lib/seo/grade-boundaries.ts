/**
 * Grade-boundary calculator helpers.
 *
 * IMPORTANT: We deliberately do NOT ship a database of specific grade-threshold
 * numbers. Cambridge thresholds are set per syllabus, per component, per session
 * and are only published on results day — hard-coding them risks being wrong, which
 * is worse than useless for a student. Instead the calculator is "bring your own
 * boundaries": the student reads the official threshold for their session and enters
 * it, and we do the arithmetic accurately. The pure helpers below power that tool.
 */

export type GradeThreshold = { grade: string; mark: number | '' }

/** Shape of the verified official data in content/data/grade-boundaries/{code}.json. */
export type OfficialComponent = {
  component: string
  paper: string
  max: number
  thresholds: { A: number; B: number; C: number; D: number; E: number }
}
export type OfficialSession = {
  session: string
  sourceUrl: string
  components: OfficialComponent[]
}
export type OfficialBoundaries = {
  code: string
  subject: string
  level: string
  source: string
  note: string
  sessions: OfficialSession[]
}

/** Default A-Level grade ladder (highest first). */
export const A_LEVEL_GRADES = ['A*', 'A', 'B', 'C', 'D', 'E'] as const
/** Default AS-Level grade ladder (highest first). */
export const AS_LEVEL_GRADES = ['a', 'b', 'c', 'd', 'e'] as const

export type GradeResult = {
  grade: string | null
  /** Next grade up, if any. */
  nextGrade: string | null
  /** Raw marks needed to reach the next grade up. */
  marksToNext: number | null
  /** Percentage of the paper total. */
  percent: number | null
}

/**
 * Given a raw mark, a paper total and the published thresholds (highest grade
 * first), return the achieved grade and the gap to the next grade up.
 */
export function computeGrade(
  raw: number,
  total: number,
  thresholds: GradeThreshold[]
): GradeResult {
  const clean = thresholds
    .filter((t): t is { grade: string; mark: number } => typeof t.mark === 'number' && t.mark >= 0)
    .sort((a, b) => b.mark - a.mark) // highest boundary first

  const percent = total > 0 ? Math.round((raw / total) * 1000) / 10 : null

  if (!clean.length) return { grade: null, nextGrade: null, marksToNext: null, percent }

  let achievedIndex = -1
  for (let i = 0; i < clean.length; i++) {
    if (raw >= clean[i].mark) {
      achievedIndex = i
      break
    }
  }

  // Below the lowest boundary → ungraded.
  if (achievedIndex === -1) {
    const lowest = clean[clean.length - 1]
    return {
      grade: 'U',
      nextGrade: lowest.grade,
      marksToNext: Math.max(0, lowest.mark - raw),
      percent,
    }
  }

  const achieved = clean[achievedIndex]
  const next = achievedIndex > 0 ? clean[achievedIndex - 1] : null
  return {
    grade: achieved.grade,
    nextGrade: next?.grade ?? null,
    marksToNext: next ? Math.max(0, next.mark - raw) : null,
    percent,
  }
}
