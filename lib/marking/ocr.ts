import type { OcrLine } from '@/lib/examiner-ink-positioning'
import { parseOcrLines } from '@/lib/examiner-ink-positioning'

export const ANSWER_OCR_PROMPT_MATH = `Transcribe the handwritten Cambridge A-Level Mathematics work in this image. For each line of working, provide:
1. The text content (use ^ for exponents, sqrt() for roots, * for multiplication where useful).
2. The bounding box as percentages of the image dimensions: top, left, width, height (each 0-100).

Also capture any visible header text, paper codes, question numbers, or session info (e.g., "9709/12", "May/June 2024", "Question 4") as separate header lines.

Output ONLY this JSON, no prose, no markdown fences:
{
  "full_text": "complete transcribed work, line breaks preserved",
  "lines": [
    { "text": "240 = 12 × 80a²", "bbox": { "top": 35.2, "left": 12.0, "width": 45.0, "height": 4.5 } }
  ]
}

Rules:
- Be precise with bounding boxes — they will overlay examiner marks on the original image.
- One JSON object per writing line; don't merge multiple lines.
- Include every step, even incorrect ones.
- Output ONLY valid JSON. No surrounding commentary.`

export const ANSWER_OCR_PROMPT_GENERAL = `Transcribe the handwritten Cambridge A-Level exam work in this image. For each line of writing, provide:
1. The text content (preserve scientific notation, chemical formulae, diagrams described briefly in [brackets]).
2. The bounding box as percentages of the image dimensions: top, left, width, height (each 0-100).

Also capture any visible header text, paper codes, question numbers, or session info as separate header lines.

Output ONLY this JSON, no prose, no markdown fences:
{
  "full_text": "complete transcribed work, line breaks preserved",
  "lines": [
    { "text": "...", "bbox": { "top": 35.2, "left": 12.0, "width": 45.0, "height": 4.5 } }
  ]
}

Rules:
- Be precise with bounding boxes — they will overlay examiner marks on the original image.
- One JSON object per writing line; don't merge multiple lines.
- Include every step, even incorrect ones.
- Output ONLY valid JSON. No surrounding commentary.`

export const WHOLE_PAPER_OCR_PROMPT = `Transcribe this ENTIRE handwritten Cambridge A-Level exam answer paper.

Preserve question boundaries — start each new question's answer with a clear line like "Question 1" or "Q1" or "1." if visible.

Include paper header (code, session) if visible at the top.

Output ONLY this JSON:
{
  "full_text": "complete transcription with question breaks preserved",
  "lines": [
    { "text": "9702/11 May/June 2024", "bbox": { "top": 5, "left": 10, "width": 40, "height": 3 } },
    { "text": "Question 1: A", "bbox": { "top": 15, "left": 10, "width": 20, "height": 3 } }
  ]
}`

export function parseOcrAnswer(raw: string): {
  full_text: string
  lines: OcrLine[]
} {
  const parsed = parseOcrLines(raw)
  if (parsed && (parsed.full_text || parsed.lines.length > 0)) {
    const fullText =
      parsed.full_text || parsed.lines.map((l) => l.text).join('\n')
    return { full_text: fullText, lines: parsed.lines }
  }
  return { full_text: raw.trim(), lines: [] }
}

export function questionPhotoOcrPrompt(subjectName?: string): string {
  const subj = subjectName || 'A-Level'
  return `Transcribe this Cambridge ${subj} question exactly as written.
Also capture ANY paper headers, codes, sessions, or question numbers visible.
Rules:
- Capture the full question including any sub-parts like (a), (b)
- Wrap math in $...$ (e.g. $Mg^{2+}$, $x^2$)
- Include any marks notation in brackets like [4]
- Include any header text like "9709/12", "May/June 2024"
- Tables: use GFM markdown with a --- separator row, e.g.:
  | Header 1 | Header 2 |
  |----------|----------|
  | Row 1A   | Row 1B   |
- Output only the question text and headers, nothing else`
}
