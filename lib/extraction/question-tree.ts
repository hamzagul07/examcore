import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_EXTRACTION_METHOD } from './config'
import type { ParsedPaperMeta } from './paper-meta'
import type { SplitQuestion } from './question-splitter'

export type TreeLinkableQuestion = SplitQuestion & {
  extraction_method: string
  extraction_confidence: number
  needs_manual_review: boolean
  needs_re_extraction: boolean
  raw_extraction_data: Record<string, unknown>
  validation?: unknown
}

export type QuestionWithIds = TreeLinkableQuestion & {
  id: string
  parent_question_id: string | null
}

/**
 * Assign UUIDs in topological order (depth 0 → leaves) and resolve parent_question_id.
 */
export function assignQuestionTreeIds<T extends TreeLinkableQuestion>(
  questions: T[]
): (T & { id: string; parent_question_id: string | null })[] {
  const sorted = [...questions].sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth
    return a.question_path.localeCompare(b.question_path, undefined, { numeric: true })
  })

  const idByNumber = new Map<string, string>()

  return sorted.map((q) => {
    const id = randomUUID()
    idByNumber.set(q.question_number, id)
    const parent_question_id = q.parent_question_number
      ? idByNumber.get(q.parent_question_number) ?? null
      : null
    return { ...q, id, parent_question_id } as T & {
      id: string
      parent_question_id: string | null
    }
  })
}

export type PersistQuestionsResult = {
  inserted: number
  withParentLink: number
}

/** Load DB questions for diagram matching (uses stable question_id from prior extraction). */
export async function loadQuestionsForDiagramMatch(
  supabase: SupabaseClient,
  sourcePdfPath: string
): Promise<QuestionWithIds[]> {
  const { data, error } = await supabase
    .from('extracted_questions')
    .select(
      'id, question_number, question_path, parent_question_id, question_text, marks, source_page_numbers, extraction_method, extraction_confidence, raw_extraction_data'
    )
    .eq('source_pdf_path', sourcePdfPath)

  if (error) {
    throw new Error(`loadQuestionsForDiagramMatch failed: ${error.message}`)
  }

  const parentById = new Map(
    (data ?? []).map((row) => [row.id, row.question_number] as const)
  )

  return (data ?? []).map((row) => {
    const raw = (row.raw_extraction_data ?? {}) as Record<string, unknown>
    const parentNum =
      row.parent_question_id != null
        ? parentById.get(row.parent_question_id) ?? null
        : null
    const depth = row.question_path.split('.').length - 1

    return {
      id: row.id,
      question_number: row.question_number,
      question_path: row.question_path,
      parent_question_number: parentNum,
      parent_question_id: row.parent_question_id,
      depth,
      is_leaf: row.marks != null,
      question_text: row.question_text,
      marks: row.marks,
      source_page_numbers: row.source_page_numbers ?? [],
      options: null,
      tables: null,
      figure_refs: Array.isArray(raw.figure_refs)
        ? (raw.figure_refs as string[])
        : [],
      extraction_method: row.extraction_method ?? DEFAULT_EXTRACTION_METHOD,
      extraction_confidence: Number(row.extraction_confidence ?? 1),
      needs_manual_review: raw.needs_manual_review === true,
      needs_re_extraction: raw.needs_re_extraction === true,
      raw_extraction_data: raw,
    }
  })
}

/**
 * Insert extracted_questions in topological order; parent_question_id FK resolved per row.
 */
export async function persistExtractedQuestions(
  supabase: SupabaseClient,
  meta: ParsedPaperMeta,
  questions: QuestionWithIds[],
  sourcePdfPath: string
): Promise<PersistQuestionsResult> {
  const sorted = [...questions].sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth
    return a.question_path.localeCompare(b.question_path, undefined, { numeric: true })
  })

  const idByNumber = new Map<string, string>()
  let inserted = 0
  let withParentLink = 0

  for (const q of sorted) {
    const parent_question_id = q.parent_question_number
      ? idByNumber.get(q.parent_question_number) ?? null
      : null

    const row = {
      id: q.id,
      subject_code: meta.subjectCode,
      paper_number: meta.paperNumber,
      variant: meta.variant,
      year: meta.year,
      session: meta.session,
      question_number: q.question_number,
      question_path: q.question_path,
      parent_question_id,
      question_text: q.question_text,
      marks: q.marks,
      source_pdf_path: sourcePdfPath,
      source_page_numbers: q.source_page_numbers,
      extraction_method: q.extraction_method ?? DEFAULT_EXTRACTION_METHOD,
      extraction_confidence: q.extraction_confidence,
      raw_extraction_data: q.raw_extraction_data,
    }

    const { error } = await supabase.from('extracted_questions').upsert(row, {
      onConflict: 'subject_code,paper_number,variant,year,session,question_number',
    })

    if (error) {
      throw new Error(`Failed to insert ${q.question_number}: ${error.message}`)
    }

    idByNumber.set(q.question_number, q.id)
    inserted++
    if (parent_question_id) withParentLink++
  }

  return { inserted, withParentLink }
}
