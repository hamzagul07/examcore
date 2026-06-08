import type { ParsedPaperMeta } from './paper-meta'

/** Expected total marks by paper number (Cambridge 9702 defaults). */
const EXPECTED_MARKS_9702: Record<string, number> = {
  '1': 40,
  '2': 60,
  '3': 40,
  '4': 100,
  '5': 30,
}

/** Fail extraction when leaf sum is below this fraction of expected. */
export const MARK_SUM_MIN_FRACTION = 0.9

export function expectedMarkTotal(meta: ParsedPaperMeta): number | null {
  if (meta.subjectCode === '9702') {
    return EXPECTED_MARKS_9702[meta.paperNumber] ?? null
  }
  return null
}

export function sumLeafMarks(
  questions: Array<{ marks: number | null; is_leaf?: boolean }>
): number {
  return questions
    .filter((q) => q.marks != null && (q.is_leaf ?? true))
    .reduce((s, q) => s + (q.marks ?? 0), 0)
}

export type MarkSumValidation = {
  pass: boolean
  leafSum: number
  expected: number | null
  minRequired: number | null
  message: string | null
}

export function validateMarkSum(
  questions: Array<{ marks: number | null; is_leaf?: boolean }>,
  meta: ParsedPaperMeta,
  minFraction = MARK_SUM_MIN_FRACTION
): MarkSumValidation {
  const leafSum = sumLeafMarks(questions)
  const expected = expectedMarkTotal(meta)

  if (expected == null) {
    return { pass: true, leafSum, expected: null, minRequired: null, message: null }
  }

  const minRequired = Math.floor(expected * minFraction)
  const pass = leafSum >= expected - 2 && leafSum >= minRequired

  const message = pass
    ? null
    : `Leaf mark sum ${leafSum} is below expected ${expected} (min ${minRequired} at ${Math.round(minFraction * 100)}% threshold)`

  return { pass, leafSum, expected, minRequired, message }
}
