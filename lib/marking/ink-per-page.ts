import {
  buildLineReferences,
  type LineReference,
  type OcrLine,
} from '@/lib/examiner-ink-positioning'
import type { MarkingAIResult } from './types'

export type PageInkSource = {
  photo_url: string
  ocr_lines: OcrLine[]
}

/** Per-page ink overlays: match marks against each page's OCR lines separately. */
export function buildPerPageInk(
  aiMarking: MarkingAIResult,
  pages: PageInkSource[]
): Array<{ photo_url: string; line_references: LineReference[] }> {
  const marks = aiMarking.marks_awarded || []
  if (!marks.length) return []

  return pages
    .filter((p) => p.photo_url)
    .map((p) => ({
      photo_url: p.photo_url,
      line_references: buildLineReferences(marks, p.ocr_lines).filter(
        (r) => r.bbox != null
      ),
    }))
    .filter((p) => p.line_references.length > 0)
}
