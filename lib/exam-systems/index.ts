export type {
  AssessmentStyle,
  Board,
  ExamQualification,
  ExamSystem,
  ExamSystemId,
  GradeModel,
  LessonSurface,
  MarkingDialect,
} from '@/lib/exam-systems/types'

export {
  getExamSystem,
  getExamSystemByProfileBoardId,
  isExamSystemId,
  listEnabledExamSystems,
  listExamSystems,
  listMarkingExamSystems,
  resolveExamSystemForSubject,
} from '@/lib/exam-systems/registry'

export {
  LESSON_SURFACES,
  isIndexableLesson,
  lessonHasSurface,
} from '@/lib/exam-systems/surfaces'

export {
  examSystemRootPath,
  lessonSurfacePath,
  qualificationHubPath,
  subjectHubPath,
} from '@/lib/exam-systems/paths'
