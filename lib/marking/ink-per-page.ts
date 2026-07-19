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

/**
 * Like {@link buildPerPageInk} but keeps EVERY page that has a stored photo —
 * pages with no matched ink get an empty `line_references` (still rendered as a
 * plain image). Persist this in `ai_marking.ink_pages` so the dashboard and
 * teacher review can re-render the full multi-page script; the `attempts` row
 * only has a single `answer_photo_url` column (page 1).
 */
export function buildAllPageInk(
  aiMarking: MarkingAIResult,
  pages: PageInkSource[]
): Array<{ photo_url: string; line_references: LineReference[] }> {
  const inkByPhoto = new Map(
    buildPerPageInk(aiMarking, pages).map((p) => [p.photo_url, p.line_references])
  )
  return pages
    .filter((p) => p.photo_url)
    .map((p) => ({
      photo_url: p.photo_url,
      line_references: inkByPhoto.get(p.photo_url) ?? [],
    }))
}
