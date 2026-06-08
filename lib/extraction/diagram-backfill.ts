import type { SupabaseClient } from '@supabase/supabase-js'
import { extractDiagramsForPages } from './diagram-extractor'
import { parseQuestionPaperPath } from './paper-meta'
import { getPdfPageCount } from './pdf-page-render'
import { collectDiagramPages } from './pdf-parser'
import {
  persistExtractedDiagrams,
  type PersistDiagramsResult,
} from './diagram-persist'
import { loadQuestionsForDiagramMatch } from './question-tree'

export type DiagramBackfillResult = {
  sourcePdfPath: string
  diagramsDetected: number
  persist: PersistDiagramsResult
  skippedReason?: string
}

export async function backfillDiagramsForPdf(
  supabase: SupabaseClient,
  sourcePdfPath: string,
  pdfBytes: ArrayBuffer,
  opts: { withDiagramDescriptions?: boolean } = {}
): Promise<DiagramBackfillResult> {
  const meta = parseQuestionPaperPath(sourcePdfPath)
  if (!meta) {
    throw new Error(`Unrecognized question paper path: ${sourcePdfPath}`)
  }

  const { data: questionRows, error: questionErr } = await supabase
    .from('extracted_questions')
    .select('id')
    .eq('source_pdf_path', sourcePdfPath)

  if (questionErr) {
    throw new Error(`backfillDiagramsForPdf questions: ${questionErr.message}`)
  }
  if (!questionRows?.length) {
    throw new Error(`No extracted_questions rows for ${sourcePdfPath}`)
  }

  const questionIds = questionRows.map((q) => q.id)
  const { count: existingCount, error: existingErr } = await supabase
    .from('extracted_diagrams')
    .select('id', { count: 'exact', head: true })
    .in('question_id', questionIds)

  if (existingErr) {
    throw new Error(`backfillDiagramsForPdf existing check: ${existingErr.message}`)
  }

  if ((existingCount ?? 0) > 0) {
    return {
      sourcePdfPath,
      diagramsDetected: 0,
      persist: { inserted: 0, skipped: 0, uploads: 0 },
      skippedReason: 'already_has_diagram_rows',
    }
  }

  const questions = await loadQuestionsForDiagramMatch(supabase, sourcePdfPath)

  const pageCount = await getPdfPageCount(pdfBytes.slice(0))
  const pages = collectDiagramPages(questions, meta, pageCount)
  if (!pages.length) {
    return {
      sourcePdfPath,
      diagramsDetected: 0,
      persist: { inserted: 0, skipped: 0, uploads: 0 },
      skippedReason: 'no_diagram_pages',
    }
  }

  const diagrams = await extractDiagramsForPages(pdfBytes.slice(0), pages, {
    withDiagramDescriptions: opts.withDiagramDescriptions === true,
  })

  if (!diagrams.length) {
    return {
      sourcePdfPath,
      diagramsDetected: 0,
      persist: { inserted: 0, skipped: 0, uploads: 0 },
      skippedReason: 'no_diagrams_detected',
    }
  }

  const persist = await persistExtractedDiagrams(
    supabase,
    meta,
    questions,
    diagrams,
    sourcePdfPath,
    opts
  )

  return { sourcePdfPath, diagramsDetected: diagrams.length, persist }
}
