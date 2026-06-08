import { z } from 'zod'

export const PaperEvidenceMetaSchema = z.object({
  subjectCode: z.string(),
  paperNumber: z.string(),
  paperKind: z.enum(['mcq', 'practical', 'structured']),
  displayName: z.string(),
  typicalComponent: z.string(),
  level: z.literal('A-Level'),
})

export const SyllabusObjectiveEvidenceSchema = z.object({
  id: z.string().uuid(),
  subject_code: z.string(),
  topic_code: z.string(),
  topic_title: z.string(),
  objective_number: z.string(),
  objective_text: z.string(),
  command_words: z.array(z.string()).nullable(),
  examined_in_papers: z.array(z.string()).nullable(),
  syllabus_year: z.number(),
})

export const QuestionTagEvidenceSchema = z.object({
  objective_id: z.string().uuid(),
  objective_number: z.string(),
  topic_code: z.string(),
  confidence: z.number(),
  tagged_by: z.string(),
  needs_human_review: z.boolean().optional(),
})

export const QuestionEvidenceSchema = z.object({
  id: z.string().uuid(),
  subject_code: z.string(),
  paper_number: z.string(),
  variant: z.string(),
  year: z.number(),
  session: z.string(),
  question_number: z.string(),
  question_path: z.string().optional(),
  question_text: z.string(),
  marks: z.number().nullable(),
  is_leaf: z.boolean(),
  section_label: z.string().nullable().optional(),
  parent_question_id: z.string().uuid().nullable(),
  parent_stem: z.string().nullable().optional(),
  source_pdf_path: z.string(),
  tags: z.array(QuestionTagEvidenceSchema),
})

export const MarkPointEvidenceSchema = z.object({
  id: z.string().uuid(),
  question_id: z.string().uuid(),
  point_text: z.string(),
  marks_awarded: z.number(),
  point_order: z.number(),
  examiner_notes: z.string().nullable(),
  alternative_phrasings: z.array(z.string()).nullable(),
  section_label: z.string().nullable().optional(),
  source_pdf_path: z.string(),
})

export const LessonEvidenceSchema = z.object({
  subjectCode: z.string(),
  paperNumber: z.string(),
  topicCode: z.string(),
  paper: PaperEvidenceMetaSchema,
  objectives: z.array(SyllabusObjectiveEvidenceSchema),
  questions: z.array(QuestionEvidenceSchema),
  markSchemes: z.array(MarkPointEvidenceSchema),
})

export type PaperEvidenceMeta = z.infer<typeof PaperEvidenceMetaSchema>
export type SyllabusObjectiveEvidence = z.infer<typeof SyllabusObjectiveEvidenceSchema>
export type QuestionTagEvidence = z.infer<typeof QuestionTagEvidenceSchema>
export type QuestionEvidence = z.infer<typeof QuestionEvidenceSchema>
export type MarkPointEvidence = z.infer<typeof MarkPointEvidenceSchema>
export type LessonEvidence = z.infer<typeof LessonEvidenceSchema>

export function parseLessonEvidence(raw: unknown): LessonEvidence {
  return LessonEvidenceSchema.parse(raw)
}
