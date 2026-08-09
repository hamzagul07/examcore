/** Cross-board curriculum graph (Phase E3) — content-first, not DB-backed yet. */

export type CurriculumBoardId =
  | 'cambridge'
  | 'edexcel'
  | 'ib'
  | 'oxfordaqa'
  | 'aqa'

export type BoardTopicRef = {
  board: CurriculumBoardId
  /** CAIE syllabus code (9709) or Edexcel unit (WMA11). */
  syllabusOrUnit: string
  /** CAIE leaf topic when known; omit for unit-grained Edexcel refs. */
  topicCode?: string
  label?: string
}

export type CanonicalConcept = {
  id: string
  label: string
  refs: BoardTopicRef[]
}

export type BoardTopicMapping = CanonicalConcept

export type AssessmentMapping = {
  id: string
  label: string
  from: BoardTopicRef
  to: BoardTopicRef
  note?: string
}

export type CurriculumGraphFile = {
  id: string
  title: string
  concepts: CanonicalConcept[]
  assessments?: AssessmentMapping[]
}

export type ResolvedCrossBoardLink = {
  board: CurriculumBoardId
  label: string
  href: string
  syllabusOrUnit: string
  topicCode?: string
}
