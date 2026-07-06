/** Detect author-template / syllabus-bullet worked examples (not exam-style). */

const HOLLOW_QUESTION_PATTERNS = [
  /apply the key .* techniques examiners expect/i,
  /^a \d{4} paper \d+ question on .*: apply the key/i,
]

const HOLLOW_SOLUTION_PATTERNS = [
  /\*\*Syllabus points for/i,
  /\*\*Method:\*\*\s*\n1\. State the business type/i,
  /^Key applications:\s*\n•/i,
]

export function isHollowWorkedExample(question: string, solution: string): boolean {
  const q = question.trim()
  const s = solution.trim()
  if (!q || !s) return true

  if (HOLLOW_QUESTION_PATTERNS.some((p) => p.test(q))) return true
  if (HOLLOW_SOLUTION_PATTERNS.some((p) => p.test(s))) return true

  const bulletLines = s.split('\n').filter((line) => /^[\s•\-*]/.test(line)).length
  const hasDigit = /\d/.test(q) || /\d/.test(s)
  if (!hasDigit && bulletLines >= 3 && s.length < 900) return true

  return false
}

export function solutionHasNumericContent(text: string): boolean {
  return (
    /\d/.test(text) ||
    /[$??]/.test(text) ||
    /\\frac|\\times|\\approx|=/.test(text)
  )
}

export function hasSubstantiveWorkedExample(
  sections: Array<{ type: string; question?: string; solution?: string }>
): boolean {
  const worked = sections.filter((s) => s.type === 'workedExample')
  return worked.some((ex) => {
    const q = ex.question ?? ''
    const s = ex.solution ?? ''
    if (isHollowWorkedExample(q, s)) return false
    return q.trim().length >= 40 && s.trim().length >= 120
  })
}

export function hasNumericWorkedExample(
  sections: Array<{ type: string; question?: string; solution?: string }>
): boolean {
  const worked = sections.filter((s) => s.type === 'workedExample')
  return worked.some((ex) => {
    const q = ex.question ?? ''
    const s = ex.solution ?? ''
    if (isHollowWorkedExample(q, s)) return false
    return solutionHasNumericContent(q) || solutionHasNumericContent(s)
  })
}

/** Subjects where at least one worked example must include figures/calculation. */
const NUMERIC_WORKED_EXAMPLE_SUBJECTS = new Set([
  '9701',
  '9702',
  '9700',
  '9709',
  '9231',
  '9618',
  '9706',
  '9708',
  '9609',
  '7115',
  '2281',
  '9699',
  '9990',
  'ib-maths-aa-hl',
  'ib-maths-aa-sl',
  'ib-maths-ai-hl',
  'ib-maths-ai-sl',
  'ib-physics-hl',
  'ib-physics-sl',
  'ib-chemistry-hl',
  'ib-chemistry-sl',
  'ib-biology-hl',
  'ib-biology-sl',
  'ib-economics-hl',
  'ib-economics-sl',
  'ib-business-management-hl',
  'ib-business-management-sl',
  'ib-computer-science-hl',
  'ib-computer-science-sl',
])

export function requiresNumericWorkedExample(subjectCode: string): boolean {
  if (NUMERIC_WORKED_EXAMPLE_SUBJECTS.has(subjectCode)) return true
  const stem = subjectCode.match(/^(\d+)/)?.[1]
  return stem ? NUMERIC_WORKED_EXAMPLE_SUBJECTS.has(stem) : false
}
