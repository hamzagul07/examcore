import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { extractJSON } from '@/lib/marking/json'
import { generateGeminiWithContents } from '@/lib/ai/gemini-text'
import { getGeminiRetryStats, resetGeminiRetryStats } from '@/lib/marking/gemini-retry'
import {
  getPdfPageCountFromPdfLib,
  splitPdfIntoChunkSpecs,
} from './pdf-chunk'
import {
  buildSyllabusChunkPrompt,
  buildSyllabusExtractionPrompt,
} from './syllabus-prompts'
import type { NewSyllabusObjective, SyllabusObjective } from './types'

const SUBJECT_NAMES: Record<string, string> = {
  '9702': 'Physics',
  '9700': 'Biology',
  '9701': 'Chemistry',
  '9618': 'Computer Science',
  '9706': 'Accounting',
  '9708': 'Economics',
  '9709': 'Mathematics',
}

/** Syllabus PDFs can be larger than question papers — allow single-shot up to 3 MB / 80 pages. */
const SYLLABUS_SINGLE_SHOT_MAX_BYTES = 3_000_000
const SYLLABUS_SINGLE_SHOT_MAX_PAGES = 80

export type RawSyllabusObjective = {
  topic_code: string
  topic_title: string
  objective_number: string
  objective_text: string
  command_words?: string[]
  examined_in_papers?: string[]
}

export type ParsedSyllabusObjective = {
  topic_code: string
  topic_title: string
  objective_number: string
  objective_text: string
  command_words: string[] | null
  examined_in_papers: string[]
}

export type SyllabusValidation = {
  pass: boolean
  objectiveCount: number
  topicsWithObjectives: number
  duplicateObjectiveNumbers: string[]
  emptyTextCount: number
  missingPapersCount: number
  topicCodesWithoutObjectives: string[]
  spotCheck143: ParsedSyllabusObjective[]
  messages: string[]
}

export type ExtractSyllabusResult = {
  subjectCode: string
  subjectName: string
  syllabusYear: number
  objectives: ParsedSyllabusObjective[]
  validation: SyllabusValidation
  pageCount: number
  chunksProcessed: number
  singleShot: boolean
  sourcePdfPath: string
  jobStatus: 'completed' | 'failed'
  errorMessage: string | null
}

function syllabusSourcePath(subjectCode: string, rootDir: string): string {
  return join(rootDir, 'syllabi-source', `${subjectCode}.pdf`)
}

function shouldUseSyllabusSingleShot(pdfBytes: ArrayBuffer, totalPages: number): boolean {
  return (
    totalPages <= SYLLABUS_SINGLE_SHOT_MAX_PAGES ||
    pdfBytes.byteLength <= SYLLABUS_SINGLE_SHOT_MAX_BYTES
  )
}

/** Normalize paper references to digit strings: "P4" → "4", "Papers 1, 2" → ["1","2"]. */
export function normalizeExaminedInPapers(raw: unknown): string[] {
  if (!raw) return []
  const items = Array.isArray(raw) ? raw : [raw]
  const papers = new Set<string>()

  for (const item of items) {
    const s = String(item).trim()
    if (!s) continue

    const rangeMatch = s.match(/papers?\s*([\d,\sand]+)/i)
    const source = rangeMatch ? rangeMatch[1] : s

    const digits = source.match(/\d+/g)
    if (digits) {
      for (const d of digits) {
        const n = parseInt(d, 10)
        if (n >= 1 && n <= 5) papers.add(String(n))
      }
    }

    const pMatch = s.match(/P(\d)/gi)
    if (pMatch) {
      for (const m of pMatch) papers.add(m.replace(/P/i, ''))
    }
  }

  return [...papers].sort()
}

function inferCommandWords(text: string, provided?: string[]): string[] | null {
  const fromProvided = (provided ?? [])
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean)
  if (fromProvided.length > 0) return [...new Set(fromProvided)]

  const lower = text.trim().toLowerCase()
  const found: string[] = []
  const patterns = [
    'define',
    'state',
    'describe',
    'explain',
    'suggest',
    'calculate',
    'determine',
    'show that',
    'show',
    'derive',
    'sketch',
    'compare',
    'evaluate',
    'discuss',
    'deduce',
    'recall',
    'understand',
    'use',
    'apply',
    'analyse',
    'analyze',
    'recognise',
    'recognize',
  ]
  for (const p of patterns) {
    if (lower.startsWith(p + ' ') || lower.startsWith(p + ',')) {
      found.push(p === 'show that' ? 'show' : p)
      break
    }
  }
  return found.length > 0 ? found : null
}

export function parseRawObjectives(
  raw: RawSyllabusObjective[]
): ParsedSyllabusObjective[] {
  const parsed: ParsedSyllabusObjective[] = []

  for (const o of raw) {
    const objective_number = String(o.objective_number ?? '').trim()
    const objective_text = String(o.objective_text ?? '').trim()
    const topic_code = String(o.topic_code ?? '').trim()
    const topic_title = String(o.topic_title ?? '').trim()
    if (!objective_number || !objective_text || !topic_code) continue

    const examined_in_papers = normalizeExaminedInPapers(o.examined_in_papers)
    parsed.push({
      topic_code,
      topic_title: topic_title || topic_code,
      objective_number,
      objective_text,
      command_words: inferCommandWords(objective_text, o.command_words),
      examined_in_papers,
    })
  }

  return parsed
}

/**
 * Cambridge sometimes prints one numbered bullet with "and distinguish between…".
 * Split into separate objectives (14.3.2 + 14.3.3) to match assessable grain.
 */
export function splitCompoundObjectives(
  objectives: ParsedSyllabusObjective[]
): ParsedSyllabusObjective[] {
  const result: ParsedSyllabusObjective[] = []

  for (const o of objectives) {
    const m = o.objective_text.match(
      /^(.+?)\s+and distinguish between\s+(.+)$/i
    )
    if (m) {
      const parts = o.objective_number.split('.')
      const seq = parseInt(parts.pop() ?? '0', 10)
      const base = parts.join('.')
      result.push({
        ...o,
        objective_number: `${base}.${seq}`,
        objective_text: m[1].trim(),
        command_words: inferCommandWords(m[1]),
      })
      result.push({
        ...o,
        objective_number: `${base}.${seq + 1}`,
        objective_text: `distinguish between ${m[2].trim()}`,
        command_words: ['distinguish'],
      })
      continue
    }
    result.push(o)
  }

  return result
}

function dedupeObjectives(
  objectives: ParsedSyllabusObjective[]
): ParsedSyllabusObjective[] {
  const byNumber = new Map<string, ParsedSyllabusObjective>()
  for (const o of objectives) {
    const existing = byNumber.get(o.objective_number)
    if (!existing || o.objective_text.length > existing.objective_text.length) {
      byNumber.set(o.objective_number, o)
    }
  }
  return [...byNumber.values()]
}

export function validateSyllabusObjectives(
  objectives: ParsedSyllabusObjective[],
  subjectCode: string
): SyllabusValidation {
  const messages: string[] = []
  const seen = new Set<string>()
  const duplicateObjectiveNumbers: string[] = []
  let emptyTextCount = 0
  let missingPapersCount = 0

  const topicsWithObjectives = new Set<string>()
  for (const o of objectives) {
    topicsWithObjectives.add(o.topic_code)
    if (!o.objective_text.trim()) emptyTextCount++
    if (o.examined_in_papers.length === 0) missingPapersCount++
    if (seen.has(o.objective_number)) {
      duplicateObjectiveNumbers.push(o.objective_number)
    }
    seen.add(o.objective_number)
  }

  // Expected numbered sub-topics from coarse lib/syllabi tree
  let topicCodesWithoutObjectives: string[] = []
  try {
    const treePath = join(process.cwd(), 'lib', 'syllabi', `${subjectCode}.json`)
    if (existsSync(treePath)) {
      const tree = JSON.parse(readFileSync(treePath, 'utf8')) as {
        topics?: Array<{ code: string }>
      }
      const expectedTopics = (tree.topics ?? []).map((t) => t.code)
      topicCodesWithoutObjectives = expectedTopics.filter(
        (code) => !topicsWithObjectives.has(code)
      )
    }
  } catch {
    // optional cross-check
  }

  const spotCheck143 = objectives.filter((o) =>
    o.objective_number.startsWith('14.3.')
  )

  if (duplicateObjectiveNumbers.length > 0) {
    messages.push(
      `Duplicate objective_number values: ${duplicateObjectiveNumbers.slice(0, 10).join(', ')}`
    )
  }
  if (emptyTextCount > 0) {
    messages.push(`${emptyTextCount} objectives with empty text`)
  }
  if (missingPapersCount > 0) {
    messages.push(`${missingPapersCount} objectives missing examined_in_papers`)
  }
  if (topicCodesWithoutObjectives.length > 0) {
    messages.push(
      `${topicCodesWithoutObjectives.length} syllabus sub-topics have no objectives (e.g. ${topicCodesWithoutObjectives.slice(0, 5).join(', ')})`
    )
  }
  if (spotCheck143.length < 3) {
    messages.push(
      `Spot check 14.3: expected 3+ objectives (14.3.1–14.3.3), got ${spotCheck143.length}`
    )
  }

  const pass =
    objectives.length > 0 &&
    duplicateObjectiveNumbers.length === 0 &&
    emptyTextCount === 0 &&
    missingPapersCount === 0 &&
    topicCodesWithoutObjectives.length === 0 &&
    spotCheck143.length >= 3

  return {
    pass,
    objectiveCount: objectives.length,
    topicsWithObjectives: topicsWithObjectives.size,
    duplicateObjectiveNumbers,
    emptyTextCount,
    missingPapersCount,
    topicCodesWithoutObjectives,
    spotCheck143,
    messages,
  }
}

async function extractChunk(
  pdfBytes: ArrayBuffer,
  subjectCode: string,
  subjectName: string,
  chunk?: {
    startPage: number
    endPage: number
    totalPages: number
    chunkIndex: number
    chunkCount: number
  }
): Promise<{
  objectives: RawSyllabusObjective[]
  syllabus_year: number | null
  page_count: number
}> {
  const base64 = Buffer.from(pdfBytes).toString('base64')
  const prompt = chunk
    ? buildSyllabusChunkPrompt(subjectCode, subjectName, chunk)
    : buildSyllabusExtractionPrompt(subjectCode, subjectName)

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
    { task: 'syllabus-extraction', maxOutputTokens: 65536, temperature: 0 }
  )

  const parsed = extractJSON(response.text ?? '') as Record<string, unknown>
  const objectives = Array.isArray(parsed.objectives)
    ? (parsed.objectives as RawSyllabusObjective[])
    : []

  const syllabus_year =
    typeof parsed.syllabus_year === 'number'
      ? parsed.syllabus_year
      : parseInt(String(parsed.syllabus_year ?? ''), 10) || null

  const page_count =
    typeof parsed.page_count === 'number'
      ? parsed.page_count
      : parseInt(String(parsed.page_count ?? '0'), 10) || 0

  return { objectives, syllabus_year, page_count }
}

export type ExtractSyllabusOptions = {
  subjectCode: string
  rootDir?: string
}

export async function extractSyllabus(
  opts: ExtractSyllabusOptions
): Promise<ExtractSyllabusResult> {
  const rootDir = opts.rootDir ?? process.cwd()
  const subjectCode = opts.subjectCode.trim()
  const subjectName = SUBJECT_NAMES[subjectCode] ?? subjectCode
  const sourcePdfPath = `syllabi-source/${subjectCode}.pdf`
  const pdfPath = syllabusSourcePath(subjectCode, rootDir)

  if (!existsSync(pdfPath)) {
    throw new Error(`Syllabus PDF not found: ${pdfPath}`)
  }

  resetGeminiRetryStats()

  const fileBytes = readFileSync(pdfPath)
  const pdfBytes = fileBytes.buffer.slice(
    fileBytes.byteOffset,
    fileBytes.byteOffset + fileBytes.byteLength
  ) as ArrayBuffer

  const totalPages = await getPdfPageCountFromPdfLib(pdfBytes).catch(() => 0)
  let allRaw: RawSyllabusObjective[] = []
  let syllabusYear: number | null = null
  let chunksProcessed = 1
  let singleShot = true

  if (shouldUseSyllabusSingleShot(pdfBytes, totalPages)) {
    console.log(
      `[syllabus] Single-shot Pro extract (${totalPages} pages, ${pdfBytes.byteLength} bytes)`
    )
    const result = await extractChunk(pdfBytes, subjectCode, subjectName)
    allRaw = result.objectives
    syllabusYear = result.syllabus_year
  } else {
    singleShot = false
    const specs = await splitPdfIntoChunkSpecs(pdfBytes)
    chunksProcessed = specs.length
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i]
      console.log(
        `[syllabus] Chunk ${i + 1}/${specs.length}: pages ${spec.startPage}–${spec.endPage}`
      )
      const result = await extractChunk(spec.bytes, subjectCode, subjectName, {
        startPage: spec.startPage,
        endPage: spec.endPage,
        totalPages: totalPages || spec.endPage,
        chunkIndex: i,
        chunkCount: specs.length,
      })
      allRaw.push(...result.objectives)
      if (result.syllabus_year != null) syllabusYear = result.syllabus_year
    }
  }

  const objectives = dedupeObjectives(
    splitCompoundObjectives(parseRawObjectives(allRaw))
  )
  const validation = validateSyllabusObjectives(objectives, subjectCode)

  const retryStats = getGeminiRetryStats()
  const errorParts = [...validation.messages]
  if (retryStats.totalRetries > 0) {
    errorParts.push(
      `Gemini API retries: ${retryStats.totalRetries} (last: ${retryStats.lastLabel ?? 'unknown'})`
    )
  }

  return {
    subjectCode,
    subjectName,
    syllabusYear: syllabusYear ?? 2024,
    objectives,
    validation,
    pageCount: totalPages,
    chunksProcessed,
    singleShot,
    sourcePdfPath,
    jobStatus: validation.pass ? 'completed' : 'failed',
    errorMessage: errorParts.length > 0 ? errorParts.join('\n') : null,
  }
}

export async function persistSyllabusObjectives(
  supabase: SupabaseClient,
  result: ExtractSyllabusResult
): Promise<number> {
  const rows: NewSyllabusObjective[] = result.objectives.map((o) => ({
    id: randomUUID(),
    subject_code: result.subjectCode,
    topic_code: o.topic_code,
    topic_title: o.topic_title,
    objective_number: o.objective_number,
    objective_text: o.objective_text,
    command_words: o.command_words,
    examined_in_papers: o.examined_in_papers,
    syllabus_year: result.syllabusYear,
    source_pdf_path: result.sourcePdfPath,
  }))

  if (rows.length === 0) return 0

  const { error } = await supabase.from('syllabus_objectives').upsert(rows, {
    onConflict: 'subject_code,objective_number,syllabus_year',
  })

  if (error) throw new Error(`Failed to persist syllabus objectives: ${error.message}`)
  return rows.length
}

export type SyllabusObjectiveRow = SyllabusObjective
