/**
 * Cambridge A-Level grade thresholds (approximate, A-Level not AS).
 * Source: typical published grade boundaries; labelled approximate in UI.
 * Keys: subject code → component → { A, B, C, D, E } as percentage of max mark
 */
export const GRADE_THRESHOLDS: Record<
  string,
  Record<string, { A: number; B: number; C: number; D: number; E: number }>
> = {
  '9709': {
    default: { A: 78, B: 68, C: 58, D: 48, E: 38 },
  },
  '9702': {
    '11': { A: 72, B: 62, C: 52, D: 42, E: 32 },
    '21': { A: 68, B: 58, C: 48, D: 38, E: 28 },
    default: { A: 70, B: 60, C: 50, D: 40, E: 30 },
  },
  '9701': {
    default: { A: 70, B: 60, C: 50, D: 40, E: 30 },
  },
  '9700': {
    default: { A: 70, B: 60, C: 50, D: 40, E: 30 },
  },
  '9708': {
    default: { A: 72, B: 62, C: 52, D: 42, E: 32 },
  },
  '9489': {
    default: { A: 75, B: 65, C: 55, D: 45, E: 35 },
  },
}

export function estimateGrade(
  subjectCode: string,
  component: string,
  percentage: number
): { grade: string; note: string } {
  const subject = GRADE_THRESHOLDS[subjectCode]
  const thresholds =
    subject?.[component] ?? subject?.default ?? {
      A: 75,
      B: 65,
      C: 55,
      D: 45,
      E: 35,
    }

  let grade = 'U'
  if (percentage >= thresholds.A) grade = 'A*'
  else if (percentage >= thresholds.A - 4) grade = 'A'
  else if (percentage >= thresholds.B) grade = 'B'
  else if (percentage >= thresholds.C) grade = 'C'
  else if (percentage >= thresholds.D) grade = 'D'
  else if (percentage >= thresholds.E) grade = 'E'

  return {
    grade,
    note: 'Approximate grade based on typical Cambridge boundaries — not official.',
  }
}
