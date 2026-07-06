import type { CourseLesson } from '@/lib/courses/types'
import { summarizeKatexValidation } from '@/lib/extraction/katex-validate'
import { applyMechanicalFixesToLesson } from './mechanical-fixes'

function collectLessonText(lesson: CourseLesson): string {
  const parts: string[] = [lesson.summary, lesson.title]
  for (const s of lesson.sections) {
    if ('content' in s) parts.push(s.content)
    if (s.type === 'keyPoints') parts.push(...s.items)
    if (s.type === 'workedExample') {
      parts.push(s.question, s.solution)
    }
  }
  if (lesson.learningObjectives) parts.push(...lesson.learningObjectives)
  if (lesson.flashcards) {
    for (const fc of lesson.flashcards) parts.push(fc.front, fc.back)
  }
  return parts.join('\n')
}

export function lessonKatexErrors(lesson: CourseLesson): string[] {
  const summary = summarizeKatexValidation(collectLessonText(lesson))
  return summary.failedFragments.map(
    (f) => `${f.fragment.slice(0, 80)} — ${f.error ?? 'parse error'}`
  )
}

/** Apply deterministic KaTeX fixes to all strings in a lesson draft. */
export function sanitizeLessonKatex(lesson: CourseLesson): CourseLesson {
  const { lesson: fixed } = applyMechanicalFixesToLesson(lesson)
  return fixed as CourseLesson
}

export function draftIntroducedKatexRegression(
  baseline: CourseLesson,
  draft: CourseLesson
): string[] {
  const baseErrors = new Set(lessonKatexErrors(baseline))
  return lessonKatexErrors(draft).filter((e) => !baseErrors.has(e))
}
