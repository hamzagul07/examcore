/**
 * Read the total marks a question is worth, deterministically, from its text.
 *
 * The marking model was being trusted to report a question's total, and it gets
 * it wrong (misreads "[Maximum mark: 8]", grabs a sub-part's marks, or invents a
 * number). Exam questions almost always STATE their marks — "[Maximum mark: 8]",
 * "(Total 6 marks)", or per-part markers "[2]", "[3]" — so we extract that in code
 * and prefer it over any model guess. Returns null only when nothing is stated
 * (then callers fall back to a student-supplied value or model inference).
 *
 * Pure and unit-tested.
 */

function toValid(raw: string): number | null {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : null
}

/**
 * Only the RELIABLE, explicit whole-question total — "[Maximum mark: 8]" or
 * "(Total 6 marks)". No per-part summing (which is error-prone when the source
 * text is partial). Safe to prefer over a model-reported total.
 */
export function extractExplicitTotalMarks(
  text: string | null | undefined
): number | null {
  if (!text) return null
  const max = text.match(/maximum\s*marks?\s*[:\-]?\s*(\d{1,3})/i)
  if (max) {
    const v = toValid(max[1])
    if (v !== null) return v
  }
  const total =
    text.match(/\btotal\s*[:\-]?\s*(\d{1,3})\s*marks?\b/i) ||
    text.match(/\(\s*total\s*[:\-]?\s*(\d{1,3})\s*marks?\s*\)/i)
  if (total) {
    const v = toValid(total[1])
    if (v !== null) return v
  }
  return null
}

/**
 * Best-effort total: explicit total first, otherwise the SUM of per-part markers
 * ([2], [3 marks], (2 marks)). The part-sum is a last resort — it over/under-counts
 * when the source text is partial, so callers with a model-reported total should
 * prefer `extractExplicitTotalMarks(...) ?? modelTotal ?? extractStatedTotalMarks(...)`.
 */
export function extractStatedTotalMarks(
  text: string | null | undefined
): number | null {
  if (!text) return null
  const explicit = extractExplicitTotalMarks(text)
  if (explicit !== null) return explicit

  const sumOf = (nums: number[]): number | null => {
    if (!nums.length) return null
    const sum = nums.reduce((a, b) => a + b, 0)
    return sum > 0 && sum <= 100 ? sum : null
  }

  // Markers with the explicit "marks" keyword — "[2 marks]", "(3 marks)" — are
  // unambiguous; sum however many appear.
  const worded = sumOf(
    [...text.matchAll(/[[(]\s*(\d{1,2})\s*marks?\s*[\])]/gi)].map((m) =>
      Number(m[1])
    )
  )
  if (worded !== null) return worded

  // Bare "[2]" markers are ambiguous (intervals like [0, 2], indices, citations),
  // so only trust them as per-part marks when there are at least TWO — a single
  // stray bracket must not be mistaken for the question total.
  const bare = [...text.matchAll(/\[\s*(\d{1,2})\s*\]/g)].map((m) => Number(m[1]))
  if (bare.length >= 2) {
    const sum = sumOf(bare)
    if (sum !== null) return sum
  }

  return null
}
