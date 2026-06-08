import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DetectedDiagram } from './diagram-extractor'
import type { ParsedPaperMeta } from './paper-meta'
import type { QuestionWithIds } from './question-tree'

export const EXTRACTED_DIAGRAMS_BUCKET = 'extracted-diagrams'

export type DiagramDescriptionStatus = 'pending' | 'complete' | 'skipped'

export type PersistDiagramsResult = {
  inserted: number
  skipped: number
  uploads: number
}

export class DiagramPersistError extends Error {
  readonly name = 'DiagramPersistError'
}

function logDiagramPersist(message: string): void {
  console.log(`[diagram-persist] ${message}`)
}

function normalizeFigKey(value: string | null | undefined): string | null {
  if (!value) return null
  const m = value.match(/fig\.?\s*(\d+(?:\.\d+)?)/i)
  return m ? m[1] : null
}

/** Map a cropped diagram to the best matching extracted question on the same page. */
export function matchDiagramToQuestion(
  diagram: DetectedDiagram,
  questions: QuestionWithIds[]
): QuestionWithIds | null {
  const page = diagram.page
  const candidates = questions.filter((q) => q.source_page_numbers.includes(page))
  if (!candidates.length) return null

  const figKey =
    normalizeFigKey(diagram.label) ??
    normalizeFigKey(diagram.caption) ??
    normalizeFigKey(diagram.bounding_box ? `Fig. ${diagram.page}` : null)

  if (figKey) {
    const byRef = candidates.find((q) =>
      q.figure_refs.some((ref) => normalizeFigKey(ref) === figKey)
    )
    if (byRef) return byRef
  }

  const withRefs = candidates.filter((q) => q.figure_refs.length > 0)
  const pool = withRefs.length ? withRefs : candidates
  return [...pool].sort((a, b) => a.depth - b.depth)[0] ?? null
}

function storagePathForDiagram(
  meta: ParsedPaperMeta,
  sourcePdfPath: string,
  diagram: DetectedDiagram,
  order: number
): string {
  const pdfSlug = sourcePdfPath.replace(/\//g, '_').replace(/\.pdf$/i, '')
  const label = diagram.label.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 48)
  return `cambridge/${meta.subjectCode}/${meta.sessionCode}/${pdfSlug}/p${diagram.page}-${order}-${label}.png`
}

function publicUrl(supabaseUrl: string, storagePath: string): string {
  const base = supabaseUrl.replace(/\/$/, '')
  return `${base}/storage/v1/object/public/${EXTRACTED_DIAGRAMS_BUCKET}/${storagePath}`
}

/**
 * Upload cropped PNGs and insert extracted_diagrams rows.
 * Skips diagrams that cannot be matched to a question on the same page.
 */
export async function persistExtractedDiagrams(
  supabase: SupabaseClient,
  meta: ParsedPaperMeta,
  questions: QuestionWithIds[],
  diagrams: DetectedDiagram[],
  sourcePdfPath: string,
  opts: { withDiagramDescriptions?: boolean } = {}
): Promise<PersistDiagramsResult> {
  if (!diagrams.length) {
    logDiagramPersist(`${sourcePdfPath}: no diagrams to persist`)
    return { inserted: 0, skipped: 0, uploads: 0 }
  }

  logDiagramPersist(
    `${sourcePdfPath}: ${diagrams.length} diagram(s) detected, ${questions.length} question(s) for matching`
  )

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new DiagramPersistError('NEXT_PUBLIC_SUPABASE_URL required for diagram URLs')
  }

  const orderByQuestion = new Map<string, number>()
  let inserted = 0
  let skipped = 0
  let uploads = 0

  for (const diagram of diagrams) {
    const question = matchDiagramToQuestion(diagram, questions)
    if (!question) {
      skipped++
      logDiagramPersist(
        `skip unmatched diagram ${diagram.label} page ${diagram.page} (no question on page)`
      )
      continue
    }

    const order = (orderByQuestion.get(question.id) ?? 0) + 1
    orderByQuestion.set(question.id, order)

    const storagePath = storagePathForDiagram(meta, sourcePdfPath, diagram, order)
    logDiagramPersist(
      `upload ${diagram.label} → ${storagePath} (question ${question.question_number})`
    )

    const { error: uploadError } = await supabase.storage
      .from(EXTRACTED_DIAGRAMS_BUCKET)
      .upload(storagePath, diagram.png, {
        contentType: 'image/png',
        upsert: true,
      })

    if (uploadError) {
      throw new DiagramPersistError(
        `Diagram upload failed (${storagePath}): ${uploadError.message}`
      )
    }
    uploads++

    const descriptionStatus: DiagramDescriptionStatus = opts.withDiagramDescriptions
      ? diagram.ai_description?.trim()
        ? 'complete'
        : 'pending'
      : 'pending'

    const row = {
      id: randomUUID(),
      question_id: question.id,
      image_storage_path: storagePath,
      image_public_url: publicUrl(supabaseUrl, storagePath),
      ai_description: diagram.ai_description,
      caption: diagram.caption,
      order_in_question: order,
      bounding_box: diagram.bounding_box,
      description_status: descriptionStatus,
    }

    logDiagramPersist(`DB insert for question_id=${question.id} order=${order}`)
    const { error: insertError } = await supabase.from('extracted_diagrams').insert(row)
    if (insertError) {
      throw new DiagramPersistError(`extracted_diagrams insert failed: ${insertError.message}`)
    }

    inserted++
  }

  logDiagramPersist(
    `${sourcePdfPath}: done inserted=${inserted} skipped=${skipped} uploads=${uploads}`
  )

  if (inserted === 0 && diagrams.length > 0) {
    throw new DiagramPersistError(
      `${sourcePdfPath}: all ${diagrams.length} diagram(s) skipped — no rows inserted`
    )
  }

  return { inserted, skipped, uploads }
}
