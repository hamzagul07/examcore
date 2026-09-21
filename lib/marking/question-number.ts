/** Normalize question ids for cache lookup (e.g. "2 (a)" → "2(a)"). */
export function normalizeQuestionNumber(q: string): string {
  return q.trim().replace(/\s+/g, '').toLowerCase()
}

export function questionNumbersMatch(a: string, b: string): boolean {
  return normalizeQuestionNumber(a) === normalizeQuestionNumber(b)
}

/**
 * True when `candidate` is `target` itself or one of its sub-parts:
 * belongsToQuestion("3(a)(ii)", "3") and belongsToQuestion("3", "3") hold,
 * belongsToQuestion("30", "3") does not.
 */
export function belongsToQuestion(candidate: string, target: string): boolean {
  const a = normalizeQuestionNumber(candidate)
  const t = normalizeQuestionNumber(target)
  return a === t || a.startsWith(`${t}(`)
}
