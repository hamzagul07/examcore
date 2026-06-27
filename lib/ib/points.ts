/**
 * IB Diploma points logic — pure + testable.
 *
 * Six subjects graded 1–7 (max 42) plus up to 3 bonus points from the
 * Theory of Knowledge (TOK) × Extended Essay (EE) matrix → /45.
 * 24 points is the minimum to be awarded the diploma, subject to conditions.
 *
 * Official TOK/EE points matrix (current):
 *           EE A  EE B  EE C  EE D  EE E
 *   TOK A     3     3     2     2     ✗
 *   TOK B     3     2     2     1     ✗
 *   TOK C     2     2     1     0     ✗
 *   TOK D     2     1     0     0     ✗
 *   TOK E     ✗     ✗     ✗     ✗     ✗
 * (✗ = failing condition — an E in TOK or EE awards 0 bonus points and fails the diploma.)
 */

export type CoreGrade = 'A' | 'B' | 'C' | 'D' | 'E'
export type SubjectLevel = 'HL' | 'SL'
export type SubjectGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7

export const CORE_GRADES: CoreGrade[] = ['A', 'B', 'C', 'D', 'E']
export const SUBJECT_GRADES: SubjectGrade[] = [7, 6, 5, 4, 3, 2, 1]

/** Bonus points for non-E grades, keyed [TOK][EE]. E is handled separately. */
const TOK_EE_MATRIX: Record<Exclude<CoreGrade, 'E'>, Record<Exclude<CoreGrade, 'E'>, number>> = {
  A: { A: 3, B: 3, C: 2, D: 2 },
  B: { A: 3, B: 2, C: 2, D: 1 },
  C: { A: 2, B: 2, C: 1, D: 0 },
  D: { A: 2, B: 1, C: 0, D: 0 },
}

export type BonusResult = { points: number; failingCondition: boolean }

/** Bonus points (0–3) from TOK & EE, or a failing condition when either is E. */
export function bonusPoints(tok: CoreGrade, ee: CoreGrade): BonusResult {
  if (tok === 'E' || ee === 'E') return { points: 0, failingCondition: true }
  return { points: TOK_EE_MATRIX[tok][ee], failingCondition: false }
}

export type DiplomaSubject = { grade: SubjectGrade; level: SubjectLevel }

export type DiplomaCondition = { label: string; pass: boolean; detail?: string }

export type DiplomaResult = {
  subjectTotal: number
  bonus: number
  total: number
  hlPoints: number
  slPoints: number
  hlCount: number
  slCount: number
  conditions: DiplomaCondition[]
  /** True when every checked condition passes (CAS is assumed complete). */
  awarded: boolean
}

/**
 * Compute the diploma score and check the published award conditions.
 * CAS is not gradable, so it is assumed complete (surfaced as a note in the UI).
 * HL/SL point thresholds are checked for the standard 3 HL + 3 SL registration.
 */
export function computeDiploma(
  subjects: DiplomaSubject[],
  tok: CoreGrade,
  ee: CoreGrade
): DiplomaResult {
  const subjectTotal = subjects.reduce((sum, s) => sum + s.grade, 0)
  const bonusR = bonusPoints(tok, ee)
  const bonus = bonusR.points
  const total = subjectTotal + bonus

  const hl = subjects.filter((s) => s.level === 'HL')
  const sl = subjects.filter((s) => s.level === 'SL')
  const hlPoints = hl.reduce((s, x) => s + x.grade, 0)
  const slPoints = sl.reduce((s, x) => s + x.grade, 0)

  const grades = subjects.map((s) => s.grade)
  const numOnes = grades.filter((g) => g === 1).length
  const numTwos = grades.filter((g) => g === 2).length
  const numThreeOrBelow = grades.filter((g) => g <= 3).length

  const conditions: DiplomaCondition[] = [
    { label: 'At least 24 points overall', pass: total >= 24, detail: `${total}/45` },
    {
      label: 'No grade E in TOK or the Extended Essay',
      pass: tok !== 'E' && ee !== 'E',
      detail: `TOK ${tok}, EE ${ee}`,
    },
    { label: 'No grade 1 in any subject', pass: numOnes === 0 },
    { label: 'No more than two grade 2s', pass: numTwos <= 2, detail: `${numTwos} twos` },
    {
      label: 'No more than three grades of 3 or below',
      pass: numThreeOrBelow <= 3,
      detail: `${numThreeOrBelow} at ≤3`,
    },
  ]

  // HL/SL thresholds apply to the standard 3 HL + 3 SL registration.
  if (hl.length === 3 && sl.length === 3) {
    conditions.push({
      label: 'At least 12 points across HL subjects',
      pass: hlPoints >= 12,
      detail: `${hlPoints} HL`,
    })
    conditions.push({
      label: 'At least 9 points across SL subjects',
      pass: slPoints >= 9,
      detail: `${slPoints} SL`,
    })
  }

  return {
    subjectTotal,
    bonus,
    total,
    hlPoints,
    slPoints,
    hlCount: hl.length,
    slCount: sl.length,
    conditions,
    awarded: conditions.every((c) => c.pass),
  }
}
