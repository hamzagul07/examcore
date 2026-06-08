import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase-admin'
import { detectPaperKind, type PaperKind } from '@/lib/extraction/paper-meta'
import { topicTagReviewThreshold } from '@/lib/extraction/review-threshold'
import {
  LessonEvidenceSchema,
  type LessonEvidence,
  type MarkPointEvidence,
  type PaperEvidenceMeta,
  type QuestionEvidence,
  type QuestionTagEvidence,
  type SyllabusObjectiveEvidence,
} from './content-source.schema'

export type GetLessonEvidenceOptions = {
  /** Include non-leaf parent rows (default: leaf questions only). */
  includeParents?: boolean
  /** Restrict to one session display name, e.g. "May/June". */
  session?: string
  /** Restrict to one year, e.g. 2024 for s24. */
  year?: number
  supabase?: SupabaseClient
}

const PAPER_DISPLAY_NAMES: Record<string, string> = {
  '1': 'Paper 1 Multiple Choice',
  '2': 'Paper 2 AS Level Structured Questions',
  '3': 'Paper 3 Advanced Practical Skills',
  '4': 'Paper 4 A Level Structured Questions',
  '5': 'Paper 5 Planning, Analysis and Evaluation',
}

function typicalComponent(paperNumber: string): string {
  return `${paperNumber}2`
}

export function resolvePaperMeta(
  subjectCode: string,
  paperNumber: string
): PaperEvidenceMeta {
  const component = typicalComponent(paperNumber)
  return {
    subjectCode,
    paperNumber,
    paperKind: detectPaperKind(component) as PaperKind,
    displayName: PAPER_DISPLAY_NAMES[paperNumber] ?? `Paper ${paperNumber}`,
    typicalComponent: component,
    level: 'A-Level',
  }
}

function isLeafRow(raw: Record<string, unknown> | null): boolean {
  if (!raw) return true
  return raw.is_leaf !== false
}

/**
 * Fetch paper-scoped lesson evidence from the extraction pipeline tables.
 * Used by Prompt B v2 lesson generation.
 */
export async function getLessonEvidence(
  subjectCode: string,
  paperNumber: string,
  topicCode: string,
  opts: GetLessonEvidenceOptions = {}
): Promise<LessonEvidence> {
  const supabase = opts.supabase ?? createAdminClient()

  const { data: objectiveRows, error: objErr } = await supabase
    .from('syllabus_objectives')
    .select('*')
    .eq('subject_code', subjectCode)
    .eq('topic_code', topicCode)
    .order('objective_number')

  if (objErr) {
    throw new Error(`Failed to load syllabus_objectives: ${objErr.message}`)
  }

  const objectives: SyllabusObjectiveEvidence[] = (objectiveRows ?? [])
    .filter((o) => {
      const papers = o.examined_in_papers as string[] | null
      return papers?.includes(paperNumber) ?? false
    })
    .map((o) => ({
      id: o.id,
      subject_code: o.subject_code,
      topic_code: o.topic_code,
      topic_title: o.topic_title,
      objective_number: o.objective_number,
      objective_text: o.objective_text,
      command_words: o.command_words,
      examined_in_papers: o.examined_in_papers,
      syllabus_year: o.syllabus_year,
    }))

  if (objectives.length === 0) {
    return LessonEvidenceSchema.parse({
      subjectCode,
      paperNumber,
      topicCode,
      paper: resolvePaperMeta(subjectCode, paperNumber),
      objectives: [],
      questions: [],
      markSchemes: [],
    })
  }

  const objectiveIds = objectives.map((o) => o.id)
  const objectiveById = new Map(objectives.map((o) => [o.id, o]))

  const { data: tagRows, error: tagErr } = await supabase
    .from('question_topic_tags')
    .select('question_id, objective_id, topic_code, confidence, tagged_by')
    .in('objective_id', objectiveIds)
    .eq('topic_code', topicCode)

  if (tagErr) {
    throw new Error(`Failed to load question_topic_tags: ${tagErr.message}`)
  }

  const questionIds = [...new Set((tagRows ?? []).map((t) => t.question_id as string))]
  if (questionIds.length === 0) {
    return LessonEvidenceSchema.parse({
      subjectCode,
      paperNumber,
      topicCode,
      paper: resolvePaperMeta(subjectCode, paperNumber),
      objectives,
      questions: [],
      markSchemes: [],
    })
  }

  let questionQuery = supabase
    .from('extracted_questions')
    .select('*')
    .eq('subject_code', subjectCode)
    .eq('paper_number', paperNumber)
    .in('id', questionIds)

  if (opts.session) questionQuery = questionQuery.eq('session', opts.session)
  if (opts.year != null) questionQuery = questionQuery.eq('year', opts.year)

  const { data: questionRows, error: qErr } = await questionQuery.order('question_number')
  if (qErr) {
    throw new Error(`Failed to load extracted_questions: ${qErr.message}`)
  }

  const tagsByQuestion = new Map<string, QuestionTagEvidence[]>()
  for (const t of tagRows ?? []) {
    const obj = objectiveById.get(t.objective_id as string)
    const list = tagsByQuestion.get(t.question_id as string) ?? []
    const confidence = Number(t.confidence)
    list.push({
      objective_id: t.objective_id as string,
      objective_number: obj?.objective_number ?? '',
      topic_code: t.topic_code as string,
      confidence,
      tagged_by: t.tagged_by as string,
      needs_human_review: confidence < topicTagReviewThreshold(paperNumber),
    })
    tagsByQuestion.set(t.question_id as string, list)
  }

  const filteredQuestions = (questionRows ?? []).filter((q) => {
    const raw = (q.raw_extraction_data ?? {}) as Record<string, unknown>
    const leaf = isLeafRow(raw)
    return opts.includeParents ? true : leaf
  })

  const parentIds = [
    ...new Set(
      filteredQuestions
        .map((q) => q.parent_question_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const parentStemById = new Map<string, string>()
  if (parentIds.length > 0) {
    const { data: parents } = await supabase
      .from('extracted_questions')
      .select('id, question_text')
      .in('id', parentIds)
    for (const p of parents ?? []) {
      parentStemById.set(p.id as string, p.question_text as string)
    }
  }

  const questions: QuestionEvidence[] = filteredQuestions.map((q) => {
    const raw = (q.raw_extraction_data ?? {}) as Record<string, unknown>
    const parentId = q.parent_question_id as string | null
    return {
      id: q.id,
      subject_code: q.subject_code,
      paper_number: q.paper_number,
      variant: q.variant,
      year: q.year,
      session: q.session,
      question_number: q.question_number,
      question_path: typeof raw.question_path === 'string' ? raw.question_path : undefined,
      question_text: q.question_text,
      marks: q.marks,
      is_leaf: isLeafRow(raw),
      section_label: (q.section_label as string | null) ?? null,
      parent_question_id: parentId,
      parent_stem: parentId ? parentStemById.get(parentId) ?? null : null,
      source_pdf_path: q.source_pdf_path,
      tags: tagsByQuestion.get(q.id as string) ?? [],
    }
  })

  const finalQuestionIds = questions.map((q) => q.id)

  const { data: markRows, error: mpErr } = await supabase
    .from('extracted_mark_points')
    .select('*')
    .in('question_id', finalQuestionIds)
    .order('point_order')

  if (mpErr) {
    throw new Error(`Failed to load extracted_mark_points: ${mpErr.message}`)
  }

  const markSchemes: MarkPointEvidence[] = (markRows ?? []).map((m) => ({
    id: m.id,
    question_id: m.question_id,
    point_text: m.point_text,
    marks_awarded: Number(m.marks_awarded),
    point_order: m.point_order,
    examiner_notes: m.examiner_notes,
    alternative_phrasings: m.alternative_phrasings,
    section_label: (m.section_label as string | null) ?? null,
    source_pdf_path: m.source_pdf_path,
  }))

  return LessonEvidenceSchema.parse({
    subjectCode,
    paperNumber,
    topicCode,
    paper: resolvePaperMeta(subjectCode, paperNumber),
    objectives,
    questions,
    markSchemes,
  })
}
