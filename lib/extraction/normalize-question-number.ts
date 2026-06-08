/**
 * Normalize question numbers for QP ↔ MS matching.
 * QP: 4(b)(ii)  MS: 4 (b) (ii) | Q4(b)(ii) | 4(b) (ii)
 * All become: 4(b)(ii)
 */
export function normalizeQuestionNumber(questionNumber: string): string {
  return questionNumber
    .trim()
    .replace(/^Q(?=\d)/i, '')
    .replace(/\s+/g, '')
    .replace(/[\[\]]/g, '')
    .replace(/\(+/g, '(')
    .replace(/\)+/g, ')')
    .toLowerCase()
}
