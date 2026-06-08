import { extractJSON } from '@/lib/marking/json'
import { generateGeminiWithContents } from '@/lib/ai/gemini-text'
import { buildChunkExtractionPrompt, buildQuestionPaperExtractionPrompt } from './prompts'
import {
  getPdfPageCountFromPdfLib,
  shouldUseSingleShot,
  splitPdfIntoChunkSpecs,
} from './pdf-chunk'
import { getPdfPageCount } from './pdf-page-render'
import type { ParsedPaperMeta } from './paper-meta'
import type { RawGeminiQuestion } from './question-splitter'

export type GeminiExtractionResult = {
  page_count: number
  questions: RawGeminiQuestion[]
  raw_response: string
  chunks_processed: number
  single_shot: boolean
}

export type ChunkContext = {
  startPage: number
  endPage: number
  totalPages: number
  chunkIndex: number
  chunkCount: number
}

function parseMarks(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10)
  return Number.isFinite(n) ? n : null
}

function mergeQuestionRecords(
  a: RawGeminiQuestion,
  b: RawGeminiQuestion
): RawGeminiQuestion {
  const textA = String(a.question_text ?? '').trim()
  const textB = String(b.question_text ?? '').trim()
  const marksA = parseMarks(a.marks)
  const marksB = parseMarks(b.marks)

  return {
    ...a,
    ...b,
    question_number: a.question_number || b.question_number,
    question_text: textB.length > textA.length ? textB : textA,
    marks: marksA ?? marksB ?? a.marks ?? b.marks,
    source_page_numbers: [
      ...new Set([
        ...(Array.isArray(a.source_page_numbers) ? a.source_page_numbers : []),
        ...(Array.isArray(b.source_page_numbers) ? b.source_page_numbers : []),
      ]),
    ],
    options: a.options ?? b.options,
    tables: (a.tables?.length ?? 0) >= (b.tables?.length ?? 0) ? a.tables : b.tables,
    figure_refs: [
      ...new Set([
        ...(Array.isArray(a.figure_refs) ? a.figure_refs : []),
        ...(Array.isArray(b.figure_refs) ? b.figure_refs : []),
      ]),
    ],
  }
}

function dedupeQuestions(questions: RawGeminiQuestion[]): RawGeminiQuestion[] {
  const byNumber = new Map<string, RawGeminiQuestion>()
  for (const q of questions) {
    const key = String(q.question_number ?? '').trim()
    if (!key) continue
    const existing = byNumber.get(key)
    byNumber.set(key, existing ? mergeQuestionRecords(existing, q) : q)
  }
  return [...byNumber.values()]
}

async function extractChunk(
  pdfBytes: ArrayBuffer,
  meta: ParsedPaperMeta,
  chunk?: ChunkContext
): Promise<GeminiExtractionResult> {
  const base64 = Buffer.from(pdfBytes).toString('base64')
  const prompt = chunk
    ? buildChunkExtractionPrompt(meta, chunk)
    : buildQuestionPaperExtractionPrompt(meta)

  const response = await generateGeminiWithContents(
    [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: base64 } },
          { text: prompt },
        ],
      },
    ],
    { task: 'pdf-extraction', maxOutputTokens: 65536, temperature: 0 }
  )

  const raw = response.text?.trim() ?? ''
  const parsed = extractJSON(raw) as Record<string, unknown>

  const questions = Array.isArray(parsed.questions)
    ? (parsed.questions as RawGeminiQuestion[])
    : []

  const page_count =
    typeof parsed.page_count === 'number'
      ? parsed.page_count
      : parseInt(String(parsed.page_count ?? '0'), 10) || 0

  return {
    page_count,
    questions,
    raw_response: raw,
    chunks_processed: 1,
    single_shot: !chunk,
  }
}

/**
 * Extract questions via Gemini Pro.
 * Small/medium PDFs: single-shot. Larger: overlapping chunks.
 */
export async function extractQuestionsWithGemini(
  pdfBytes: ArrayBuffer,
  meta: ParsedPaperMeta
): Promise<GeminiExtractionResult> {
  const totalPages =
    (await getPdfPageCountFromPdfLib(pdfBytes).catch(() => 0)) ||
    (await getPdfPageCount(pdfBytes).catch(() => 0))

  if (shouldUseSingleShot(pdfBytes, totalPages)) {
    console.log(
      `[extraction] Single-shot Pro extract (${totalPages} pages, ${pdfBytes.byteLength} bytes)`
    )
    try {
      const single = await extractChunk(pdfBytes, meta)
      return {
        ...single,
        page_count: totalPages || single.page_count,
        chunks_processed: 1,
        single_shot: true,
      }
    } catch (err) {
      console.warn(
        '[extraction] Single-shot failed; falling back to overlapping chunks:',
        err instanceof Error ? err.message : err
      )
    }
  }

  const specs = await splitPdfIntoChunkSpecs(pdfBytes)
  const allQuestions: RawGeminiQuestion[] = []
  const rawParts: string[] = []

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i]
    console.log(
      `[extraction] Chunk ${i + 1}/${specs.length}: pages ${spec.startPage}–${spec.endPage} of ${totalPages}`
    )

    const result = await extractChunk(spec.bytes, meta, {
      startPage: spec.startPage,
      endPage: spec.endPage,
      totalPages: totalPages || spec.endPage,
      chunkIndex: i,
      chunkCount: specs.length,
    })

    allQuestions.push(...result.questions)
    rawParts.push(result.raw_response)
  }

  return {
    page_count: totalPages,
    questions: dedupeQuestions(allQuestions),
    raw_response: rawParts.join('\n---CHUNK---\n'),
    chunks_processed: specs.length,
    single_shot: false,
  }
}
