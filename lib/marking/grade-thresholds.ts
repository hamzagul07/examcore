import { resolveBoard } from '@/lib/courses/board'

/**
 * Approximate A-Level grade boundaries, as a percentage of the paper's
 * maximum mark. Labelled approximate in the UI; never presented as official.
 *
 * Keys are the grades themselves. The table used to be keyed A…E with no A*
 * row, and `estimateGrade` read its `A` value as the A* boundary and `A - 4`
 * as A — so every subject's real A threshold was handed out as an A*, and a
 * script four points under an A was still told it had one. Values below are
 * typical published Cambridge thresholds: A* runs roughly 8–10 points above
 * A, and the steps below A are about ten points each.
 */
export type GradeThresholdTable = {
  A_STAR: number
  A: number
  B: number
  C: number
  D: number
  E: number
}

export const GRADE_THRESHOLDS: Record<string, Record<string, GradeThresholdTable>> = {
  // Mathematics — thresholds run high; an A on a pure paper is ~78%.
  '9709': {
    default: { A_STAR: 86, A: 78, B: 68, C: 58, D: 48, E: 38 },
  },
  // Physics — the MCQ paper (11/12/13) sits higher than the structured papers.
  '9702': {
    '11': { A_STAR: 80, A: 72, B: 62, C: 52, D: 42, E: 32 },
    '12': { A_STAR: 80, A: 72, B: 62, C: 52, D: 42, E: 32 },
    '13': { A_STAR: 80, A: 72, B: 62, C: 52, D: 42, E: 32 },
    '21': { A_STAR: 76, A: 68, B: 58, C: 48, D: 38, E: 28 },
    '22': { A_STAR: 76, A: 68, B: 58, C: 48, D: 38, E: 28 },
    '23': { A_STAR: 76, A: 68, B: 58, C: 48, D: 38, E: 28 },
    default: { A_STAR: 78, A: 70, B: 60, C: 50, D: 40, E: 30 },
  },
  // Chemistry
  '9701': {
    default: { A_STAR: 78, A: 70, B: 60, C: 50, D: 40, E: 30 },
  },
  // Biology
  '9700': {
    default: { A_STAR: 78, A: 70, B: 60, C: 50, D: 40, E: 30 },
  },
  // Economics
  '9708': {
    default: { A_STAR: 80, A: 72, B: 62, C: 52, D: 42, E: 32 },
  },
  // History
  '9489': {
    default: { A_STAR: 83, A: 75, B: 65, C: 55, D: 45, E: 35 },
  },
}

/** Used when the subject (or the board) has no table of its own. */
export const DEFAULT_GRADE_THRESHOLDS: GradeThresholdTable = {
  A_STAR: 83,
  A: 75,
  B: 65,
  C: 55,
  D: 45,
  E: 35,
}

export const CAMBRIDGE_GRADE_NOTE =
  'Approximate grade based on typical Cambridge boundaries — not official.'
export const GENERIC_GRADE_NOTE =
  'Approximate grade based on typical A-Level boundaries — not official.'
export const NO_GRADE_NOTE =
  'Grade projection is not available for this board — percentage only.'

/** Boards whose papers are graded A*–E, so a letter projection means something. */
const LETTER_GRADED_BOARDS = new Set(['cambridge', 'edexcel', 'oxfordaqa', 'aqa'])

/**
 * Letter grade for a percentage. `grade` is '' when the board does not award
 * A*–E (IB's 1–7, AP's 1–5) — a letter there would be an invention, and the
 * caller shows the percentage alone.
 *
 * Non-Cambridge boards get the generic table and a board-neutral note: the
 * previous version handed Edexcel and OxfordAQA papers Cambridge defaults
 * under a note that said "Cambridge boundaries".
 */
export function estimateGrade(
  subjectCode: string,
  component: string,
  percentage: number
): { grade: string; note: string } {
  const board = resolveBoard(subjectCode)
  if (!LETTER_GRADED_BOARDS.has(board)) {
    return { grade: '', note: NO_GRADE_NOTE }
  }

  const isCambridge = board === 'cambridge'
  const subject = isCambridge ? GRADE_THRESHOLDS[subjectCode] : undefined
  const thresholds =
    subject?.[component] ?? subject?.default ?? DEFAULT_GRADE_THRESHOLDS

  let grade = 'U'
  if (percentage >= thresholds.A_STAR) grade = 'A*'
  else if (percentage >= thresholds.A) grade = 'A'
  else if (percentage >= thresholds.B) grade = 'B'
  else if (percentage >= thresholds.C) grade = 'C'
  else if (percentage >= thresholds.D) grade = 'D'
  else if (percentage >= thresholds.E) grade = 'E'

  return {
    grade,
    note: isCambridge ? CAMBRIDGE_GRADE_NOTE : GENERIC_GRADE_NOTE,
  }
}
