/**
 * The grade spread of a mock (docs/TEACHER_SYSTEM_SPEC.md §4: "Mock sets add
 * MockDistributionPanel (grade histogram via predictGrade per student;
 * NO_DATA under 3 marked)").
 *
 * Each student who has handed in the WHOLE mock is placed by their mark on
 * it, through the same percentage boundaries the student's own predicted
 * grade uses (predictGradeFromPercentage). A student part-way through is
 * left out: a grade from one question of a paper is not a mock grade.
 *
 * Letter grades are only drawn for boards that grade A*–U. IB courses (7–1)
 * and AP (5–1) have no percentage boundaries the platform can stand behind,
 * so their mocks are shown in plain percentage bands instead — a spread, not
 * a claim about a grade.
 *
 * Below MOCK_MIN_MARKED marked students the panel shows NO_DATA: two scripts
 * make a pair, not a distribution. Pure.
 */

import { predictGradeFromPercentage, type GradeLetter } from '@/lib/grade-boundaries'
import { HANDED_IN_STATES } from '@/lib/teacher/assignment-status'
import type { StudentAssignmentState } from '@/lib/teacher/types'

export const MOCK_MIN_MARKED = 3

export const GRADE_ORDER: readonly GradeLetter[] = ['A*', 'A', 'B', 'C', 'D', 'E', 'U']

/** Percentage bands for boards without letter grades: [label, lower bound inclusive]. */
export const PERCENT_BANDS: ReadonlyArray<readonly [string, number]> = [
  ['80–100%', 80],
  ['70–79%', 70],
  ['60–69%', 60],
  ['50–59%', 50],
  ['40–49%', 40],
  ['0–39%', 0],
]

export type MockBin = { label: string; count: number; names: string[] }

export type MockDistribution = {
  scale: 'grades' | 'percent'
  /** Students who handed in the whole mock with a usable mark. */
  marked: number
  /** Students on the set who have not (yet) handed it all in. */
  unmarked: number
  enough: boolean
  bins: MockBin[]
  /** Median mark of the marked students, 0–100, one decimal; null when none. */
  median_pct: number | null
}

function markedPct(s: StudentAssignmentState): number | null {
  const complete = s.items.length > 0 && s.items.every((i) => HANDED_IN_STATES.has(i.state))
  if (!complete) return null
  return typeof s.overall_pct === 'number' && Number.isFinite(s.overall_pct) ? s.overall_pct : null
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const m = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  return Math.round(m * 10) / 10
}

export function mockDistribution(
  students: readonly StudentAssignmentState[],
  opts: { letterGrades: boolean }
): MockDistribution {
  const scored: Array<{ name: string; pct: number }> = []
  let unmarked = 0
  for (const s of students) {
    const pct = markedPct(s)
    if (pct === null) {
      // Someone who left without finishing is not "still to come".
      if (s.membership === 'active' && !s.excused) unmarked += 1
      continue
    }
    scored.push({ name: s.display_name, pct })
  }

  const labels = opts.letterGrades ? [...GRADE_ORDER] : PERCENT_BANDS.map(([label]) => label)
  const bins: MockBin[] = labels.map((label) => ({ label, count: 0, names: [] }))
  for (const { name, pct } of scored) {
    const label = opts.letterGrades
      ? predictGradeFromPercentage(pct).grade
      : (PERCENT_BANDS.find(([, floor]) => pct >= floor) ?? PERCENT_BANDS[PERCENT_BANDS.length - 1])[0]
    const bin = bins.find((b) => b.label === label)
    if (bin) {
      bin.count += 1
      bin.names.push(name)
    }
  }
  for (const b of bins) b.names.sort((x, y) => x.localeCompare(y))

  return {
    scale: opts.letterGrades ? 'grades' : 'percent',
    marked: scored.length,
    unmarked,
    enough: scored.length >= MOCK_MIN_MARKED,
    bins,
    median_pct: median(scored.map((s) => s.pct)),
  }
}
