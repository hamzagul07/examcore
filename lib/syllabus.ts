/**
 * Cambridge International A-Level Mathematics 9709 syllabus — single source of
 * truth for topic codes, names, and paper grouping.
 *
 * Used by the marking API (validates Claude's tag output), the UI (renders
 * badges), and any future analytics queries against `attempts.syllabus_tags`
 * and `mark_schemes.syllabus_tags`.
 *
 * IMPORTANT: codes are stored in the database. Renaming an existing code here
 * (e.g. "1.7" → "1.07") would orphan historical rows. Add new codes, never
 * rename old ones.
 */

export type SyllabusCode = string // e.g. "1.1", "3.7"

export type SyllabusPaper = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6'

export interface SyllabusTopic {
  code: SyllabusCode
  paper: SyllabusPaper
  paperName: string
  name: string
}

export const CAMBRIDGE_9709_SYLLABUS: SyllabusTopic[] = [
  // Paper 1: Pure Mathematics 1
  { code: '1.1', paper: 'P1', paperName: 'Pure Mathematics 1', name: 'Quadratics' },
  { code: '1.2', paper: 'P1', paperName: 'Pure Mathematics 1', name: 'Functions' },
  { code: '1.3', paper: 'P1', paperName: 'Pure Mathematics 1', name: 'Coordinate geometry' },
  { code: '1.4', paper: 'P1', paperName: 'Pure Mathematics 1', name: 'Circular measure' },
  { code: '1.5', paper: 'P1', paperName: 'Pure Mathematics 1', name: 'Trigonometry' },
  { code: '1.6', paper: 'P1', paperName: 'Pure Mathematics 1', name: 'Series' },
  { code: '1.7', paper: 'P1', paperName: 'Pure Mathematics 1', name: 'Differentiation' },
  { code: '1.8', paper: 'P1', paperName: 'Pure Mathematics 1', name: 'Integration' },

  // Paper 2: Pure Mathematics 2
  { code: '2.1', paper: 'P2', paperName: 'Pure Mathematics 2', name: 'Algebra' },
  { code: '2.2', paper: 'P2', paperName: 'Pure Mathematics 2', name: 'Logarithmic and exponential functions' },
  { code: '2.3', paper: 'P2', paperName: 'Pure Mathematics 2', name: 'Trigonometry' },
  { code: '2.4', paper: 'P2', paperName: 'Pure Mathematics 2', name: 'Differentiation' },
  { code: '2.5', paper: 'P2', paperName: 'Pure Mathematics 2', name: 'Integration' },
  { code: '2.6', paper: 'P2', paperName: 'Pure Mathematics 2', name: 'Numerical solution of equations' },

  // Paper 3: Pure Mathematics 3
  { code: '3.1', paper: 'P3', paperName: 'Pure Mathematics 3', name: 'Algebra' },
  { code: '3.2', paper: 'P3', paperName: 'Pure Mathematics 3', name: 'Logarithmic and exponential functions' },
  { code: '3.3', paper: 'P3', paperName: 'Pure Mathematics 3', name: 'Trigonometry' },
  { code: '3.4', paper: 'P3', paperName: 'Pure Mathematics 3', name: 'Differentiation' },
  { code: '3.5', paper: 'P3', paperName: 'Pure Mathematics 3', name: 'Integration' },
  { code: '3.6', paper: 'P3', paperName: 'Pure Mathematics 3', name: 'Numerical solution of equations' },
  { code: '3.7', paper: 'P3', paperName: 'Pure Mathematics 3', name: 'Vectors' },
  { code: '3.8', paper: 'P3', paperName: 'Pure Mathematics 3', name: 'Differential equations' },
  { code: '3.9', paper: 'P3', paperName: 'Pure Mathematics 3', name: 'Complex numbers' },

  // Paper 4: Mechanics
  { code: '4.1', paper: 'P4', paperName: 'Mechanics', name: 'Forces and equilibrium' },
  { code: '4.2', paper: 'P4', paperName: 'Mechanics', name: 'Kinematics of motion in a straight line' },
  { code: '4.3', paper: 'P4', paperName: 'Mechanics', name: 'Momentum' },
  { code: '4.4', paper: 'P4', paperName: 'Mechanics', name: "Newton's laws of motion" },
  { code: '4.5', paper: 'P4', paperName: 'Mechanics', name: 'Energy, work and power' },

  // Paper 5: Probability & Statistics 1
  { code: '5.1', paper: 'P5', paperName: 'Probability & Statistics 1', name: 'Representation of data' },
  { code: '5.2', paper: 'P5', paperName: 'Probability & Statistics 1', name: 'Permutations and combinations' },
  { code: '5.3', paper: 'P5', paperName: 'Probability & Statistics 1', name: 'Probability' },
  { code: '5.4', paper: 'P5', paperName: 'Probability & Statistics 1', name: 'Discrete random variables' },
  { code: '5.5', paper: 'P5', paperName: 'Probability & Statistics 1', name: 'The normal distribution' },

  // Paper 6: Probability & Statistics 2
  { code: '6.1', paper: 'P6', paperName: 'Probability & Statistics 2', name: 'The Poisson distribution' },
  { code: '6.2', paper: 'P6', paperName: 'Probability & Statistics 2', name: 'Linear combinations of random variables' },
  { code: '6.3', paper: 'P6', paperName: 'Probability & Statistics 2', name: 'Continuous random variables' },
  { code: '6.4', paper: 'P6', paperName: 'Probability & Statistics 2', name: 'Sampling and estimation' },
  { code: '6.5', paper: 'P6', paperName: 'Probability & Statistics 2', name: 'Hypothesis tests' },
]

const SYLLABUS_BY_CODE: Map<SyllabusCode, SyllabusTopic> = new Map(
  CAMBRIDGE_9709_SYLLABUS.map((t) => [t.code, t])
)

export function getSyllabusTopicByCode(
  code: SyllabusCode
): SyllabusTopic | undefined {
  return SYLLABUS_BY_CODE.get(code)
}

export function getValidSyllabusCodes(): SyllabusCode[] {
  return CAMBRIDGE_9709_SYLLABUS.map((t) => t.code)
}

export const VALID_SYLLABUS_CODES: Set<SyllabusCode> = new Set(
  getValidSyllabusCodes()
)

export const TOTAL_SYLLABUS_TOPICS = CAMBRIDGE_9709_SYLLABUS.length // 38

/**
 * Normalize and filter an array of raw codes returned by an LLM. Drops
 * invalids silently (Claude occasionally invents codes), de-dupes while
 * preserving order, caps at `max` codes as a safety net.
 */
export function normalizeSyllabusTags(
  raw: unknown,
  max: number = 5
): SyllabusCode[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: SyllabusCode[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const code = item.trim()
    if (!VALID_SYLLABUS_CODES.has(code)) continue
    if (seen.has(code)) continue
    seen.add(code)
    out.push(code)
    if (out.length >= max) break
  }
  return out
}
