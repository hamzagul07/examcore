import type { CourseLesson } from '@/lib/courses/types'
import { countGenericFlashcards } from '@/lib/courses/stem-deep-quality'

/** Quality gate for TOK / EE / CAS / Group 6 arts lessons (no numeric worked examples required). */
export function assertHumanitiesLesson(lesson: CourseLesson): string[] {
  const issues: string[] = []
  const worked = (lesson.sections ?? []).filter((s) => s.type === 'workedExample')
  if (worked.length < 1) {
    issues.push(`need ≥1 worked example / case study (found ${worked.length})`)
  }

  const fc = lesson.flashcards ?? []
  if (fc.length < 10) issues.push(`need ≥10 flashcards (found ${fc.length})`)
  const genericFc = countGenericFlashcards(lesson)
  if (genericFc > 3) issues.push(`${genericFc} generic flashcards`)

  const steps = lesson.simpleExplanation?.steps ?? []
  if (steps.length !== 4) {
    issues.push(`need exactly 4 simpleExplanation steps (found ${steps.length})`)
  }

  if (!lesson.simpleExplanation?.analogy?.trim()) issues.push('missing analogy')

  const headings = (lesson.sections ?? []).filter((s) => s.type === 'heading').length
  if (headings < 3) issues.push(`need ≥3 headings (found ${headings})`)

  const textSections = (lesson.sections ?? []).filter((s) => s.type === 'text').length
  if (textSections < 2) issues.push(`need ≥2 text sections (found ${textSections})`)

  return issues
}
