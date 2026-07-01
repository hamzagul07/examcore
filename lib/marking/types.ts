export type MarkingStyle = 'mcq' | 'point_based' | 'level_of_response' | 'mixed'

export type MarkingMode =
  | 'official_mark_scheme'
  | 'general_criteria_paper_not_in_db'
  | 'general_criteria'
  /** User chose practice/homework — not a past paper; same Cambridge conventions. */
  | 'general_criteria_practice'

/** How the user intended single-question marking (past paper vs own question). */
export type MarkIntent = 'past_paper' | 'practice_question'

export type UploadMode = 'single_question' | 'whole_paper'

/** IB selection axes carried on an upload (M1). */
export type IbLevel = 'HL' | 'SL'
export type IbComponentKey =
  | 'paper_1'
  | 'paper_2'
  | 'paper_3'
  | 'ia'
  | 'ee'
  | 'tok_essay'
  | 'tok_exhibition'
  | 'io'

/**
 * DB-free view of a resolved IB catalog component, assembled by the pipeline from
 * the ib_* tables and handed to prompt-building. Keeps build-marking-prompt free of
 * any Supabase import. M1 consumes the `points` shape; `criteria` is carried for M3.
 */
export type ResolvedIbComponent = {
  subjectName: string
  componentLabel: string
  level: IbLevel
  assessmentModel: 'points' | 'criteria'
  maxMarks: number | null
  /** Points model: subject-level conventions + any matched per-question official scheme. */
  pointsConventions?: { accept?: string; ecf?: string }
  officialScheme?: unknown | null
  /** Criteria model (M3): not consumed yet. */
  criteria?: Array<{
    letter: string
    name: string
    maxMarks: number
    guidance?: string
    bands: Array<{ min: number; max: number; descriptor: string; guidance?: string }>
  }>
}

export type MarkSchemeRow = {
  id: string
  board: string
  subject: string
  paper_code: string
  paper_session: string
  question_number: string
  question_text: string
  total_marks: number
  mark_scheme: Record<string, unknown>
  marking_type?: MarkingStyle | null
  syllabus_tags?: string[] | null
}

export type DetectedPaper = {
  paper_code: string
  paper_session: string
  question_number: string
}

export type MarkAwarded = {
  mark_id: number | string
  type: string
  earned: boolean
  reasoning: string
  error_classification?: string | null
  line_reference?: string | null
  margin_note?: string | null
}

export type LorBandResult = {
  level: number
  marks_awarded: number
  marks_available: number
  band_descriptor: string
  justification: string
  strengths?: string[]
  improvements?: string[]
}

export type IbCriterionResult = {
  criterion: string
  criterion_name: string
  level: number
  marks_awarded: number
  marks_available: number
  band_descriptor: string
  justification: string
  strengths?: string[]
  improvements?: string[]
}

export type MarkingAIResult = {
  marks_awarded?: MarkAwarded[]
  marks_earned: number
  total_marks: number
  summary: string
  weak_topics: string[]
  what_to_study_next: string
  estimated_marks_explanation?: string
  syllabus_tags?: string[]
  marking_style?: MarkingStyle
  /** Level-of-response specific */
  band_result?: LorBandResult
  /** IB multi-criterion (EE, TOK, arts) */
  criteria_results?: IbCriterionResult[]
  /** MCQ specific */
  mcq_breakdown?: Array<{
    question_number: string
    student_answer: string
    correct_answer: string
    correct: boolean
  }>
}

export type QuestionMarkStatus =
  | 'attempted'
  | 'unattempted'
  | 'marking_failed'
  | 'pending'

export type QuestionMarkResult = {
  question_number: string
  marks_earned: number
  total_marks: number
  marking_style: MarkingStyle
  summary: string
  ai_marking: MarkingAIResult
  mark_scheme_id?: string | null
  line_references?: unknown[]
  status?: QuestionMarkStatus
  error_message?: string
  answer_photo_url?: string | null
  /** All page images for this question (multi-page working) */
  page_photo_urls?: string[]
  /** Per-page ink overlay data (photo + line refs with bboxes) */
  ink_pages?: Array<{
    photo_url: string
    line_references: unknown[]
  }>
  /** OCR answer text — used for per-question retry */
  answer_text?: string
  /** Syllabus tags for loading UI / progress */
  syllabus_tags?: string[]
}

export type WholePaperScoreBlock = {
  marks_earned: number
  total_marks: number
  percentage: number
  estimated_grade?: string
  grade_note?: string
}

export type WholePaperResult = {
  upload_mode: 'whole_paper'
  marks_earned: number
  total_marks: number
  percentage: number
  estimated_grade?: string
  grade_note?: string
  /** Score on attempted questions only */
  attempted_score?: WholePaperScoreBlock
  /** Score treating unattempted questions as zero */
  full_paper_score?: WholePaperScoreBlock
  show_dual_scores?: boolean
  questions_excluded_count?: number
  questions: QuestionMarkResult[]
  summary: string
  paper_code?: string
  paper_session?: string
  /** Retained for per-question retry with ink (not shown in UI) */
  pages_ocr?: Array<{
    photo_url: string
    full_text: string
    ocr_lines: unknown[]
    question_label: string | null
  }>
}

export type WholePaperJobPhase =
  | 'queued'
  | 'ocr'
  | 'segmenting'
  | 'marking'
  | 'complete'
  | 'failed'

export type WholePaperLoadingContext = {
  paper_code: string
  paper_session: string
  question_number: string
  syllabus_tags?: string[]
}

export type WholePaperJobProgress = {
  phase: WholePaperJobPhase
  message: string
  questions_total: number
  questions_completed: number
  current_question?: string
  estimated_seconds_remaining?: number
  loading_context?: WholePaperLoadingContext
  result?: WholePaperResult
  error?: string
}
