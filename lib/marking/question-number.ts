/** Normalize question ids for cache lookup (e.g. "2 (a)" → "2(a)"). */
export function normalizeQuestionNumber(q: string): string {
  return q.trim().replace(/\s+/g, '').toLowerCase()
}

export function questionNumbersMatch(a: string, b: string): boolean {
  return normalizeQuestionNumber(a) === normalizeQuestionNumber(b)
}
