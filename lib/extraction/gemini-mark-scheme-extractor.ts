import { extractJSON } from '@/lib/marking/json'
import { generateGeminiWithContents } from '@/lib/ai/gemini-text'
import {
  buildMarkSchemeChunkPrompt,
  buildMarkSchemeExtractionPrompt,
} from './mark-scheme-prompts'
import {
  getPdfPageCountFromPdfLib,
  shouldUseSingleShot,
  splitPdfIntoChunkSpecs,
} from './pdf-chunk'
import type { ParsedPaperMeta } from './paper-meta'

export type RawMarkingPoint = {
  point_text: string
  marks_awarded: number | string
  examiner_notes?: string | null
  alternative_phrasings?: string[]
  is_subtotal?: boolean
}

export type RawMarkSchemeEntry = {
  question_number: string
  question_subtotal?: number | null
  source_page_numbers?: number[]
  marking_points: RawMarkingPoint[]
}

export type GeminiMarkSchemeResult = {
  page_count: number
  paper_total: number | null
  entries: RawMarkSchemeEntry[]
  raw_response: string
  chunks_processed: number
  single_shot: boolean
}

function mergeEntryRecords(
  a: RawMarkSchemeEntry,
  b: RawMarkSchemeEntry
): RawMarkSchemeEntry {
  const points = [...a.marking_points, ...b.marking_points]
  const seen = new Set<string>()
  const deduped = points.filter((p) => {
    const key = `${p.point_text}|${p.marks_awarded}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return {
    question_number: a.question_number || b.question_number,
    question_subtotal: a.question_subtotal ?? b.question_subtotal,
    source_page_numbers: [
      ...new Set([
        ...(a.source_page_numbers ?? []),
        ...(b.source_page_numbers ?? []),
      ]),
    ],
    marking_points: deduped,
  }
}

function dedupeEntries(entries: RawMarkSchemeEntry[]): RawMarkSchemeEntry[] {
  const byNumber = new Map<string, RawMarkSchemeEntry>()
  for (const e of entries) {
    const key = String(e.question_number ?? '').trim()
    if (!key) continue
    const existing = byNumber.get(key)
    byNumber.set(key, existing ? mergeEntryRecords(existing, e) : e)
  }
  return [...byNumber.values()]
}

async function extractChunk(
  pdfBytes: ArrayBuffer,
  meta: ParsedPaperMeta,
  chunk?: {
    startPage: number
    endPage: number
    totalPages: number
    chunkIndex: number
    chunkCount: number
  }
): Promise<GeminiMarkSchemeResult> {
  const base64 = Buffer.from(pdfBytes).toString('base64')
  const prompt = chunk
    ? buildMarkSchemeChunkPrompt(meta, chunk)
    : buildMarkSchemeExtractionPrompt(meta)

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

  const entries = Array.isArray(parsed.entries)
    ? (parsed.entries as RawMarkSchemeEntry[])
    : []

  const page_count =
    typeof parsed.page_count === 'number'
      ? parsed.page_count
      : parseInt(String(parsed.page_count ?? '0'), 10) || 0

  const paper_total =
    typeof parsed.paper_total === 'number'
      ? parsed.paper_total
      : parseInt(String(parsed.paper_total ?? ''), 10) || null

  return {
    page_count,
    paper_total: Number.isFinite(paper_total) ? paper_total : null,
    entries,
    raw_response: raw,
    chunks_processed: 1,
    single_shot: !chunk,
  }
}

/** Extract marking points from a mark scheme PDF via Gemini Pro. */
export async function extractMarkSchemeWithGemini(
  pdfBytes: ArrayBuffer,
  meta: ParsedPaperMeta
): Promise<GeminiMarkSchemeResult> {
  const totalPages =
    (await getPdfPageCountFromPdfLib(pdfBytes).catch(() => 0)) ||
    0

  if (shouldUseSingleShot(pdfBytes, totalPages)) {
    console.log(
      `[mark-scheme] Single-shot Pro extract (${totalPages} pages, ${pdfBytes.byteLength} bytes)`
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
        '[mark-scheme] Single-shot failed; falling back to overlapping chunks:',
        err instanceof Error ? err.message : err
      )
    }
  }

  const specs = await splitPdfIntoChunkSpecs(pdfBytes)
  const allEntries: RawMarkSchemeEntry[] = []
  const rawParts: string[] = []
  let paperTotal: number | null = null

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i]
    console.log(
      `[mark-scheme] Chunk ${i + 1}/${specs.length}: pages ${spec.startPage}–${spec.endPage} of ${totalPages}`
    )

    const result = await extractChunk(spec.bytes, meta, {
      startPage: spec.startPage,
      endPage: spec.endPage,
      totalPages: totalPages || spec.endPage,
      chunkIndex: i,
      chunkCount: specs.length,
    })

    allEntries.push(...result.entries)
    rawParts.push(result.raw_response)
    if (result.paper_total != null) paperTotal = result.paper_total
  }

  return {
    page_count: totalPages,
    paper_total: paperTotal,
    entries: dedupeEntries(allEntries),
    raw_response: rawParts.join('\n---CHUNK---\n'),
    chunks_processed: specs.length,
    single_shot: false,
  }
}
