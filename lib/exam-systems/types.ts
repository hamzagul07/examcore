/**
 * ExamSystem adapters — board-agnostic examination platform core (Phase E0).
 *
 * Boards are acquisition surfaces; marking dialects and grade models differ.
 * CAIE and IB are first-class adapters; Edexcel / OxfordAQA / AQA / AP are
 * registered stubs until their shells and marking packs ship.
 *
 * @see docs/BOARD_EXPANSION_ENGINE.md
 */

/** Stable product id used in routes, analytics, mark picker, community. */
export type ExamSystemId =
  | 'cambridge'
  | 'ib'
  | 'edexcel'
  | 'oxfordaqa'
  | 'aqa'
  | 'ap'

/**
 * Legacy alias used across courses/mark/community.
 * Live resolving still only returns cambridge | ib until new adapters own codes.
 */
export type Board = ExamSystemId

export type GradeModel =
  | 'raw_marks'
  | 'ums'
  | 'markbands'
  | 'ap_1_to_5'
  | 'levels'
  | 'mixed'

export type MarkingDialect =
  | 'point_method' // B1/M1/A1, dependent marks
  | 'criterion_bands' // IB markbands
  | 'earned_point' // AP FRQ points earned / not earned
  | 'level_of_response'
  | 'mixed'

export type AssessmentStyle = 'linear' | 'modular' | 'diploma' | 'ap_course' | 'mixed'

/** Topic child surfaces — liberated from CAIE-only naming. */
export type LessonSurface = 'flashcards' | 'faq' | 'quiz' | 'questions' | 'mistakes'

export type ExamQualification = {
  id: string
  label: string
  /** URL segment under the board prefix, e.g. international-a-level */
  slug: string
  /** Shown in shells even before marking packs exist */
  shellEnabled: boolean
  markingEnabled: boolean
}

export type ExamSystem = {
  id: ExamSystemId
  /** Display name for hubs and SEO */
  label: string
  shortLabel: string
  /**
   * Value stored on user_profiles.board / onboarding BOARDS id.
   * Cambridge → "Cambridge International", IB → "IB", etc.
   */
  profileBoardId: string
  /** Selectable in onboarding when true */
  enabled: boolean
  /** Appears on /mark board picker when true */
  markingEnabled: boolean
  /** First URL segment: /caie, /ib, /edexcel, … */
  routePrefix: string
  qualifications: ExamQualification[]
  gradeModel: GradeModel
  markingDialect: MarkingDialect
  assessmentStyle: AssessmentStyle
  /** Short hint under the mark board picker option */
  markPickerHint: string
  /**
   * Whether a content/catalog subject code belongs to this system.
   * Cambridge: numeric syllabus codes. IB: non-numeric slugs.
   * Future boards: explicit code registries.
   */
  ownsSubjectCode: (code: string) => boolean
  /** Directory key under content/courses/ */
  contentSubjectCode: (code: string) => string
  /** Canonical catalog / route slug */
  catalogSubjectSlug: (code: string) => string
  /** Human label for UI copy */
  boardLabel: (code: string) => string
}
