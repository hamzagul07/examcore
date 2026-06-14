import type { CourseLesson } from '@/lib/courses/types'

const GENERIC_FLASHCARD_PATTERNS = [
  /^What syllabus point is/i,
  /^Which paper tests/i,
  /^State one command word Cambridge uses/i,
  /^Why show working in/i,
  /^How does .+ connect to the wider/i,
]

const GENERIC_STEP_PATTERNS = [
  /^Identify the key definitions and symbols/i,
  /^Mark your attempt strictly/i,
  /^Link the concept to a diagram, equation, or mechanism where applicable/i,
]

const GENERIC_WORKED_PATTERNS = [
  /A past-paper style question on .+: explain the key principle/i,
  /A second structured question testing .+: calculate or deduce/i,
  /^\*\*Step 1 — Define terms:\*\* State the precise definition Cambridge expects for the core quantity/i,
]

export function isGenericFlashcard(front: string): boolean {
  return GENERIC_FLASHCARD_PATTERNS.some((re) => re.test(front.trim()))
}

export function isGenericStep(step: string): boolean {
  return GENERIC_STEP_PATTERNS.some((re) => re.test(step.trim()))
}

export function isGenericWorkedExample(question: string, solution: string): boolean {
  return (
    GENERIC_WORKED_PATTERNS.some((re) => re.test(question.trim()) || re.test(solution.trim())) ||
    (!/\d/.test(solution) && !/\$/.test(solution))
  )
}

export function countGenericFlashcards(lesson: CourseLesson): number {
  return (lesson.flashcards ?? []).filter((fc) => isGenericFlashcard(fc.front)).length
}

export function assertDeepLesson(lesson: CourseLesson): string[] {
  const issues: string[] = []
  const worked = (lesson.sections ?? []).filter((s) => s.type === 'workedExample')
  if (worked.length < 2) issues.push(`need ≥2 worked examples (found ${worked.length})`)
  for (const [i, ex] of worked.entries()) {
    if (ex.type !== 'workedExample') continue
    if (isGenericWorkedExample(ex.question, ex.solution)) {
      issues.push(`workedExample ${i + 1} is generic template`)
    }
  }

  const fc = lesson.flashcards ?? []
  if (fc.length < 10) issues.push(`need ≥10 flashcards (found ${fc.length})`)
  const genericFc = countGenericFlashcards(lesson)
  if (genericFc > 2) issues.push(`${genericFc} generic flashcards`)

  const steps = lesson.simpleExplanation?.steps ?? []
  if (steps.length !== 4) issues.push(`need exactly 4 simpleExplanation steps (found ${steps.length})`)
  const genericSteps = steps.filter(isGenericStep).length
  if (genericSteps > 0) issues.push(`${genericSteps} generic carousel steps`)

  if (!lesson.simpleExplanation?.analogy?.trim()) issues.push('missing analogy')

  const headings = (lesson.sections ?? []).filter((s) => s.type === 'heading').length
  if (headings < 3) issues.push(`need ≥3 headings (found ${headings})`)

  const textSections = (lesson.sections ?? []).filter((s) => s.type === 'text').length
  if (textSections < 3) issues.push(`need ≥3 text sections (found ${textSections})`)

  return issues
}

export function isDeepLesson(lesson: CourseLesson): boolean {
  return assertDeepLesson(lesson).length === 0
}
