/**
 * Lock the denominator for one question inside a combined-script split.
 * Matches the main freeform gate: student total wins when this split is a
 * single question. Multi-Q scripts never stamp a script-level hint onto every
 * item (that would mark three questions out of 18 each).
 */

export function resolveSplitQuestionTotalMarks(input: {
  extracted: number | null
  splitterTotal: number | null
  studentTotal: number | null
  singleQuestionSplit: boolean
}): number | null {
  const extracted =
    typeof input.extracted === 'number' && input.extracted > 0
      ? input.extracted
      : null
  const splitter =
    typeof input.splitterTotal === 'number' && input.splitterTotal > 0
      ? input.splitterTotal
      : null
  const student =
    typeof input.studentTotal === 'number' && input.studentTotal > 0
      ? input.studentTotal
      : null

  if (input.singleQuestionSplit) {
    return student ?? extracted ?? splitter
  }

  return extracted ?? splitter
}
