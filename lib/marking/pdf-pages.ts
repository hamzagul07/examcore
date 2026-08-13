import {
  GEMINI_FLASH_MODEL,
  getGeminiClient,
  withGeminiCallTimeout,
} from '@/lib/ai/gemini-text'
import { withGeminiRetry } from './gemini-retry'
import { parseOcrAnswer } from './ocr'
import type { OcrLine } from '@/lib/examiner-ink-positioning'

const PDF_PAGES_OCR_PROMPT = `This PDF is a student's handwritten Cambridge A-Level exam answer paper.
Transcribe EACH PAGE separately. Preserve question boundaries on each page.

Output ONLY this JSON:
{
  "pages": [
    {
      "page_index": 1,
      "full_text": "transcription for page 1",
      "lines": [
        { "text": "...", "bbox": { "top": 5, "left": 10, "width": 40, "height": 3 } }
      ]
    }
  ]
}`

export type PdfPageOcr = {
  page_index: number
  full_text: string
  lines: OcrLine[]
}

/**
 * The client is resolved per attempt, inside the retry loop.
 *
 * It used to arrive as a parameter, resolved once by the caller — which meant a
 * capacity failover had no effect here: every retry went back to the provider
 * that had just refused. PDF OCR is the worst place for that. The slowest run
 * on record (731s, five retries, dead at `reading_work`) was a PDF, because a
 * whole script is one large multimodal call and the retries are expensive.
 */
export async function ocrPdfToPages(
  pdfBytes: ArrayBuffer
): Promise<PdfPageOcr[]> {
  const base64 = Buffer.from(pdfBytes).toString('base64')
  const response = await withGeminiRetry(
    () =>
      // Deadline-aware hard timeout: this call is built here rather than via
      // the gemini-text helpers, so without this it is invisible to the
      // request budget and can hang for the client's full baked-in timeout.
      withGeminiCallTimeout((signal) =>
        getGeminiClient().models.generateContent({
          model: GEMINI_FLASH_MODEL,
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: 'application/pdf', data: base64 } },
                { text: PDF_PAGES_OCR_PROMPT },
              ],
            },
          ],
          // Deterministic OCR — same scan should transcribe the same way each run.
          config: { temperature: 0, abortSignal: signal },
        })
      ),
    { label: 'pdf-pages-ocr' }
  )
  const raw = response.text || ''
  try {
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim()) as {
      pages?: Array<{
        page_index?: number
        full_text?: string
        lines?: OcrLine[]
      }>
    }
    if (Array.isArray(parsed.pages) && parsed.pages.length > 0) {
      return parsed.pages.map((p, i) => ({
        page_index: p.page_index ?? i + 1,
        full_text: p.full_text || '',
        lines: Array.isArray(p.lines) ? p.lines : [],
      }))
    }
  } catch {
    // fall through to single-page
  }
  const single = parseOcrAnswer(raw)
  return [
    {
      page_index: 1,
      full_text: single.full_text,
      lines: single.lines,
    },
  ]
}

/** Flatten a PDF into plain text (e.g. question sheet OCR). */
/** Same per-attempt client resolution as `ocrPdfToPages`, for the same reason. */
export async function ocrPdfToPlainText(
  pdfBytes: ArrayBuffer,
  prompt: string
): Promise<string> {
  const base64 = Buffer.from(pdfBytes).toString('base64')
  const response = await withGeminiRetry(
    () =>
      withGeminiCallTimeout((signal) =>
        getGeminiClient().models.generateContent({
          model: GEMINI_FLASH_MODEL,
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: 'application/pdf', data: base64 } },
                { text: prompt },
              ],
            },
          ],
          config: { temperature: 0, abortSignal: signal },
        })
      ),
    { label: 'pdf-plain-ocr' }
  )
  return (response.text || '').trim()
}
