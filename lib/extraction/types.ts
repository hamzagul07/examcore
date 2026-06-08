/**
 * TypeScript types for Prompt C extraction pipeline tables.
 * Keep in sync with supabase/migrations/20260606_extraction_pipeline.sql
 */

export type ExtractionMethod = 'gemini-pro' | 'mathpix' | 'gemini-vision' | 'manual'

export type ExtractionPdfType = 'question-paper' | 'mark-scheme' | 'syllabus'

export type ExtractionJobStatus = 'pending' | 'running' | 'completed' | 'failed'

export type ExamSession = 'Feb/March' | 'May/June' | 'Oct/Nov'

export interface ExtractedQuestion {
  id: string
  subject_code: string
  paper_number: string
  variant: string
  year: number
  session: ExamSession | string
  question_number: string
  question_path: string
  parent_question_id: string | null
  question_text: string
  marks: number | null
  source_pdf_path: string
  source_page_numbers: number[]
  extraction_method: ExtractionMethod | null
  extraction_confidence: number | null
  raw_extraction_data: Record<string, unknown> | null
  section_label: string | null
  created_at: string
  updated_at: string
}

export interface ExtractedMarkPoint {
  id: string
  question_id: string
  point_text: string
  marks_awarded: number
  point_order: number
  examiner_notes: string | null
  alternative_phrasings: string[] | null
  source_pdf_path: string
  source_page_numbers: number[]
  section_label: string | null
  created_at: string
}

export interface DiagramBoundingBox {
  x: number
  y: number
  width: number
  height: number
  page: number
}

export type DiagramDescriptionStatus = 'pending' | 'complete' | 'skipped'

export interface ExtractedDiagram {
  id: string
  question_id: string
  image_storage_path: string
  image_public_url: string
  ai_description: string | null
  caption: string | null
  order_in_question: number
  bounding_box: DiagramBoundingBox | null
  description_status: DiagramDescriptionStatus
  created_at: string
}

export interface SyllabusObjective {
  id: string
  subject_code: string
  topic_code: string
  topic_title: string
  objective_number: string
  objective_text: string
  command_words: string[] | null
  examined_in_papers: string[] | null
  syllabus_year: number
  source_pdf_path: string
  created_at: string
}

export interface QuestionTopicTag {
  question_id: string
  objective_id: string
  topic_code: string
  confidence: number
  tagged_by: string
  reviewed_by_human: boolean
  tagged_at: string
}

export interface ExtractionJob {
  id: string
  source_pdf_path: string
  pdf_type: ExtractionPdfType
  status: ExtractionJobStatus
  started_at: string | null
  completed_at: string | null
  pages_processed: number
  questions_extracted: number
  diagrams_extracted: number
  cost_usd: number
  error_message: string | null
  retry_count: number
  metadata: Record<string, unknown>
  created_at: string
}

/** Insert shapes (omit server-generated fields). */
export type NewExtractedQuestion = Omit<
  ExtractedQuestion,
  'id' | 'created_at' | 'updated_at'
> & { id?: string }

export type NewExtractedMarkPoint = Omit<ExtractedMarkPoint, 'id' | 'created_at'> & {
  id?: string
}

export type NewExtractedDiagram = Omit<ExtractedDiagram, 'id' | 'created_at'> & {
  id?: string
}

export type NewSyllabusObjective = Omit<SyllabusObjective, 'id' | 'created_at'> & {
  id?: string
}

export type NewQuestionTopicTag = Omit<QuestionTopicTag, 'tagged_at'> & {
  tagged_at?: string
}

export type NewExtractionJob = Omit<
  ExtractionJob,
  'id' | 'created_at' | 'pages_processed' | 'questions_extracted' | 'diagrams_extracted' | 'cost_usd' | 'retry_count'
> & {
  id?: string
  pages_processed?: number
  questions_extracted?: number
  diagrams_extracted?: number
  cost_usd?: number
  retry_count?: number
}
