import type {
  CourseLesson,
  CourseQuestionBankItem,
  LessonSection,
  LessonSubtopic,
  SimpleExplanation,
} from '@/lib/courses/types'

export type StemDeepSpec = {
  summary?: string
  durationMin?: number
  learningObjectives?: string[]
  simpleExplanation: SimpleExplanation
  flashcards: { front: string; back: string; pillLabel?: string }[]
  sections: LessonSection[]
  faq?: { q: string; a: string }[]
  /** Official-granularity syllabus sub-topics this lesson covers. */
  subtopics?: LessonSubtopic[]
  /** Study-Loop practice question bank (mark-by-mark, original). */
  questionBank?: CourseQuestionBankItem[]
}

export type StemDeepPartial = Partial<CourseLesson> & {
  simpleExplanation?: SimpleExplanation
}
