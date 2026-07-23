/**
 * Bridge between Gemini's OCR output (per-line bounding boxes) and Claude's
 * marking output (mark snippets). Each mark Claude awarded references the
 * student's working by a short text snippet — we map that snippet back to the
 * closest OCR line so the Examiner's Ink Overlay knows where to draw.
 *
 * The matcher is intentionally fuzzy: handwriting OCR is noisy, and Claude
 * sometimes paraphrases the snippet slightly. We try a few strategies in
 * descending order of confidence and accept the first hit.
 */

import { normalizeErrorClassification, type ErrorClassification } from './error-classifications'

export interface OcrBoundingBox {
  /** All values are percentages of the image dimensions (0–100). */
  top: number
  left: number
  width: number
  height: number
}

export interface OcrLine {
  text: string
  bbox: OcrBoundingBox
}

export interface MarkAwardedWithRefs {
  mark_id: string | number
  type?: string
  earned: boolean
  reasoning?: string
  error_classification?: string | null
  line_reference?: string | null
  margin_note?: string | null
}

export interface LineReference {
  /** Stamp code, e.g. "B1", "M1", "A1". NOT unique — a script can carry two M1
   * marks — so it must not be used to identify a specific mark for selection. */
  mark_id: string
  /** Stable unique identity for selection: the mark's index in the awarded-marks
   * array. Two marks sharing a code ("M1", "M1") get distinct ref_ids, so
   * selecting one highlights exactly one stamp. Persisted with the reference. */
  ref_id: string
  earned: boolean
  margin_note: string | null
  error_classification: ErrorClassification
  bbox: OcrBoundingBox | null
  snippet: string
}

/** Strip whitespace, lowercase, drop punctuation so noisy strings match. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9+\-=.·×÷^()/\\]/g, '')
    .trim()
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) {
    const shorter = Math.min(na.length, nb.length)
    const longer = Math.max(na.length, nb.length)
    return shorter / longer
  }
  // Token overlap as a fallback. Cheap but works well enough for short math
  // snippets where exact substring matches fail because of OCR noise.
  const tokensA = new Set(na.match(/.{1,3}/g) || [])
  const tokensB = new Set(nb.match(/.{1,3}/g) || [])
  if (!tokensA.size || !tokensB.size) return 0
  let hits = 0
  for (const t of tokensA) if (tokensB.has(t)) hits += 1
  return hits / Math.max(tokensA.size, tokensB.size)
}

function pickStampCode(mark: MarkAwardedWithRefs, fallbackIndex: number): string {
  if (typeof mark.type === 'string' && mark.type.trim()) return mark.type.trim().toUpperCase()
  if (typeof mark.mark_id === 'string' && /^[A-Z]+\d/.test(mark.mark_id.trim())) {
    return mark.mark_id.trim().toUpperCase()
  }
  // Numeric mark_ids ("1", "2"): synthesise a generic stamp.
  return `M${fallbackIndex + 1}`
}

const MATCH_THRESHOLD = 0.35

/**
 * Build the array of `line_references` that gets stored on the attempt and
 * fed to the overlay. Marks Claude couldn't position get `bbox: null`; the UI
 * renders those in a "general feedback" footer rather than on the image.
 */
export function buildLineReferences(
  marksAwarded: MarkAwardedWithRefs[] | null | undefined,
  ocrLines: OcrLine[] | null | undefined
): LineReference[] {
  if (!Array.isArray(marksAwarded) || marksAwarded.length === 0) return []
  const lines = Array.isArray(ocrLines) ? ocrLines : []

  return marksAwarded.map((mark, idx) => {
    const stamp = pickStampCode(mark, idx)
    const snippet = (mark.line_reference || '').toString().trim()
    const classification = normalizeErrorClassification(mark.error_classification)
    const marginNote =
      typeof mark.margin_note === 'string' && mark.margin_note.trim()
        ? mark.margin_note.trim()
        : null

    let bestMatch: OcrLine | null = null
    let bestScore = 0
    if (snippet && lines.length > 0) {
      for (const line of lines) {
        const score = similarity(snippet, line.text)
        if (score > bestScore) {
          bestScore = score
          bestMatch = line
        }
      }
    }

    return {
      mark_id: stamp,
      // Global position in the awarded-marks array. buildLineReferences runs over
      // the SAME full array for every page (see buildPerPageInk), so this index
      // is stable and unique across pages and matches the audit list's selection.
      ref_id: String(idx),
      earned: !!mark.earned,
      margin_note: marginNote,
      error_classification: classification,
      bbox: bestMatch && bestScore >= MATCH_THRESHOLD ? bestMatch.bbox : null,
      snippet,
    }
  })
}

/**
 * Pull the Gemini OCR JSON shape ({ full_text, lines }) out of the raw
 * response string. Returns `null` on any parse failure — callers fall back to
 * the previous "just the text" code path so OCR remains robust even if the
 * model didn't emit lines.
 */
export function parseOcrLines(raw: string): { full_text: string; lines: OcrLine[] } | null {
  if (!raw) return null
  try {
    const jsonMatch =
      raw.match(/```json\s*([\s\S]*?)```/) ||
      raw.match(/```\s*([\s\S]*?)```/) ||
      raw.match(/{[\s\S]*}/)
    const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : raw
    const parsed = JSON.parse(jsonString)
    if (!parsed || typeof parsed !== 'object') return null
    const fullText = typeof parsed.full_text === 'string' ? parsed.full_text : ''
    if (!Array.isArray(parsed.lines)) {
      return fullText ? { full_text: fullText, lines: [] } : null
    }
    const lines: OcrLine[] = []
    for (const item of parsed.lines) {
      if (!item || typeof item.text !== 'string') continue
      const bbox = item.bbox || {}
      const top = Number(bbox.top)
      const left = Number(bbox.left)
      const width = Number(bbox.width)
      const height = Number(bbox.height)
      if (
        !Number.isFinite(top) ||
        !Number.isFinite(left) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height)
      ) {
        continue
      }
      lines.push({
        text: item.text.trim(),
        bbox: {
          top: clamp(top, 0, 100),
          left: clamp(left, 0, 100),
          width: clamp(width, 0, 100),
          height: clamp(height, 0, 100),
        },
      })
    }
    return { full_text: fullText, lines }
  } catch {
    return null
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
