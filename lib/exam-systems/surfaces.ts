/**
 * Shared lesson surface graph — board-agnostic.
 * Previously lived as CAIE-only types in lib/seo/caie-graph.ts; IB already reused them.
 */

import type { CourseLesson } from '@/lib/courses/types'
import type { LessonSurface } from '@/lib/exam-systems/types'

export type { LessonSurface }

export const LESSON_SURFACES: LessonSurface[] = [
  'flashcards',
  'faq',
  'quiz',
  'questions',
  'mistakes',
]

/** Full lessons only — outlines do not get child surface URLs (thin content gate). */
export function isIndexableLesson(lesson: CourseLesson): boolean {
  return lesson.status === 'published' || lesson.status === 'premium'
}

export function lessonHasSurface(lesson: CourseLesson, surface: LessonSurface): boolean {
  if (!isIndexableLesson(lesson)) return false
  switch (surface) {
    case 'flashcards':
      return (lesson.flashcards?.length ?? 0) >= 3
    case 'faq':
      return (lesson.faq?.length ?? 0) >= 2
    case 'quiz':
      return (lesson.quickCheck?.length ?? 0) >= 2
    case 'questions': {
      const practice = lesson.sections?.some((s) => s.type === 'pastPaperPractice')
      const worked = lesson.sections?.some((s) => s.type === 'workedExample')
      return Boolean(practice || worked || (lesson.pastPaperReferences?.length ?? 0) > 0)
    }
    case 'mistakes': {
      const tips = lesson.sections?.filter((s) => s.type === 'examTip') ?? []
      return tips.length >= 1 || (lesson.faq?.length ?? 0) >= 1
    }
    default:
      return false
  }
}
