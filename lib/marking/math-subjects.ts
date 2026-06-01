/** Cambridge math subject codes — use math-specific OCR prompts. */
export const MATH_SUBJECT_CODES = new Set(['9709', '9231', '4024', '4037'])

export function isMathSubjectCode(code?: string | null): boolean {
  return !!code && MATH_SUBJECT_CODES.has(code)
}
