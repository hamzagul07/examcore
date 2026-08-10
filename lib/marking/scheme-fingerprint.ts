/**
 * Fingerprint a freeform question so derived mark schemes can be cached and
 * reused across remakes. Same stem + subject + total → same key; whitespace
 * and trivial OCR noise collapse away. Different totals never collide.
 */

import { createHash } from 'crypto'

export function normalizeQuestionForFingerprint(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    // Soft hyphens / zero-width noise from OCR/PDF extractors
    .replace(/[\u00ad\u200b\u200c\u200d\ufeff]/g, '')
    // Collapse all whitespace (including newlines) so line-break OCR drift
    // does not mint a new cache key for the same stem.
    .replace(/\s+/g, ' ')
    .trim()
}

export function schemeFingerprint(params: {
  questionText: string
  totalMarks: number
  subjectCode?: string | null
  board?: string | null
}): string {
  const total = Math.round(params.totalMarks)
  const subject = (params.subjectCode || '').trim().toLowerCase()
  const board = (params.board || '').trim().toLowerCase()
  const payload = [
    normalizeQuestionForFingerprint(params.questionText),
    `total:${total}`,
    `subject:${subject}`,
    `board:${board}`,
  ].join('\n---\n')
  return createHash('sha256').update(payload).digest('hex')
}
