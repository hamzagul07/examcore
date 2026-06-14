import type { CourseLesson, LessonSection, SimpleExplanation } from '@/lib/courses/types'

export type StemDeepSpec = {
  summary?: string
  durationMin?: number
  learningObjectives?: string[]
  simpleExplanation: SimpleExplanation
  flashcards: { front: string; back: string; pillLabel?: string }[]
  sections: LessonSection[]
  faq?: { q: string; a: string }[]
}

export type StemDeepPartial = Partial<CourseLesson> & {
  simpleExplanation?: SimpleExplanation
}
