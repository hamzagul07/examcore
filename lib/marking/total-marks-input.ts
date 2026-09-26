/**
 * The one rule for a typed "total marks" on /mark.
 *
 * The classic desk, the topic-page deep link (`?marks=`), the lesson handoff
 * and the v2 MarkFlow all validate the total separately, and the v2 reducer
 * had stopped requiring it while its screen still did — so Continue lit up
 * and did nothing. One bound, one parser.
 *
 * 100 is the largest single-question total on any paper we mark; anything
 * above it is a typo (a paper total, a year) and would set the denominator
 * for every percentage that follows.
 */
export const MAX_TOTAL_MARKS = 100

export function isValidTotalMarks(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= MAX_TOTAL_MARKS
  )
}

/** A typed total, or null when blank or unusable. Rounded: "7.0" is 7. */
export function parseTotalMarksInput(raw: string | null | undefined): number | null {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return isValidTotalMarks(n) ? Math.round(n) : null
}
