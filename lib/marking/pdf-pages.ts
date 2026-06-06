import { GoogleGenAI } from '@google/genai'
import { GEMINI_TEXT_MODEL } from '@/lib/ai/gemini-text'
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

export async function ocrPdfToPages(
  pdfBytes: ArrayBuffer,
  genAI: GoogleGenAI
): Promise<PdfPageOcr[]> {
  const base64 = Buffer.from(pdfBytes).toString('base64')
  const response = await withGeminiRetry(
    () =>
      genAI.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'application/pdf', data: base64 } },
              { text: PDF_PAGES_OCR_PROMPT },
            ],
          },
        ],
      }),
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
