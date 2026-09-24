import {
  GEMINI_FLASH_MODEL,
  getGeminiClient,
  withGeminiCallTimeout,
} from '@/lib/ai/gemini-text'
import { PDFDocument } from 'pdf-lib'
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
async function ocrPdfWhole(
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

/** Pages OCR'd from one upload; beyond this the rest is dropped with a warning. */
export const MAX_PDF_PAGES = 20
/** Pages in flight at once — the same bound as a multi-photo upload. */
export const PDF_OCR_CONCURRENCY = 4

export type PageOcr = { full_text: string; lines: OcrLine[] }

export type PdfSplit = {
  /** One single-page PDF per page, in document order, up to the cap. */
  pages: ArrayBuffer[]
  /** Pages in the document, including any the cap dropped. */
  total: number
}

/**
 * One single-page PDF per page. pdf-lib copies page objects without
 * rendering, so this is quick and the bytes stay a PDF Gemini reads directly.
 */
export async function splitPdfPages(
  pdfBytes: ArrayBuffer,
  maxPages = MAX_PDF_PAGES
): Promise<PdfSplit> {
  const src = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const total = src.getPageCount()
  const count = Math.max(0, Math.min(total, maxPages))
  const pages: ArrayBuffer[] = []
  for (let i = 0; i < count; i++) {
    const dst = await PDFDocument.create()
    const [page] = await dst.copyPages(src, [i])
    dst.addPage(page)
    const bytes = await dst.save()
    pages.push(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    )
  }
  return { pages, total }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () => worker())
  )
  return results
}

export type OcrPdfOptions = {
  /** OCR one page — the pipeline passes the same call a photographed page gets. */
  ocrPage: (pageBytes: ArrayBuffer, pageNumber: number) => Promise<PageOcr>
  maxPages?: number
  concurrency?: number
  /** Told the page count once the document is open, for the run log. */
  onPageCount?: (total: number, read: number) => void
  /** The whole-document read used when the PDF cannot be split. Test seam. */
  ocrWhole?: (pdfBytes: ArrayBuffer) => Promise<PdfPageOcr[]>
}

/**
 * Read a PDF one page at a time, four in flight.
 *
 * It used to be one call: the entire PDF in, every page's transcript with
 * per-line boxes out as a single JSON document, with no page cap and no
 * output cap. Short scripts were fine — successful PDF reads averaged 43
 * seconds. Long ones were not: over the 30 days to 2026-09-24, 16 of the 28
 * PDF uploads failed, their reads averaging 230 seconds and reaching 737,
 * the output cut off mid-document, the fallback parsing what was left as
 * one page of nothing, and the student told "we couldn't find a question in
 * your upload" or that marking had timed out. Photographed pages were
 * already read one at a time with four in flight; PDF pages now are too,
 * with the same OCR call, including the Pro escalation for a read that
 * comes back as nonsense. Without `ocrPage` (or when the file will not
 * split) the whole-document read still runs.
 */
export async function ocrPdfToPages(
  pdfBytes: ArrayBuffer,
  opts?: OcrPdfOptions
): Promise<PdfPageOcr[]> {
  const whole = opts?.ocrWhole ?? ocrPdfWhole
  if (!opts?.ocrPage) return whole(pdfBytes)

  let split: PdfSplit
  try {
    split = await splitPdfPages(pdfBytes, opts.maxPages ?? MAX_PDF_PAGES)
  } catch (err) {
    console.warn('[ocr] pdf could not be split into pages; reading it whole', err)
    return whole(pdfBytes)
  }
  opts.onPageCount?.(split.total, split.pages.length)
  if (split.total > split.pages.length) {
    console.warn(
      `[ocr] pdf has ${split.total} pages; reading the first ${split.pages.length}`
    )
  }
  if (split.pages.length === 0) return []

  const { ocrPage } = opts
  const read = await mapWithConcurrency(
    split.pages,
    opts.concurrency ?? PDF_OCR_CONCURRENCY,
    (bytes, i) => ocrPage(bytes, i + 1)
  )
  return read.map((r, i) => ({
    page_index: i + 1,
    full_text: r.full_text,
    lines: Array.isArray(r.lines) ? r.lines : [],
  }))
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
