/** Cambridge math subject codes — use math-specific OCR prompts. */
export const MATH_SUBJECT_CODES = new Set(['9709', '9231', '4024', '4037'])

/** Edexcel IAL Maths family unit prefixes (Pure / Mechanics / Statistics). */
const EDEXCEL_MATH_UNIT = /^W(MA|ME|ST)\d{2}$/i

export function isMathSubjectCode(code?: string | null): boolean {
  if (!code) return false
  if (MATH_SUBJECT_CODES.has(code)) return true
  return EDEXCEL_MATH_UNIT.test(code.trim())
}
