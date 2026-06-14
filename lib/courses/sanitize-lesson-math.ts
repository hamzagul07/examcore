import type { CourseLesson, LessonSection } from '@/lib/courses/types'
import { countUnescapedDollars, repairMathDelimiters } from '@/lib/courses/math-format'

function repair(value: unknown): string | undefined {
  if (value == null || value === '') return value as undefined
  if (typeof value !== 'string') return String(value)
  return repairMathDelimiters(value)
}

function repairSection(section: LessonSection): LessonSection {
  switch (section.type) {
    case 'intro':
    case 'text':
    case 'examTip':
    case 'formula':
      return { ...section, content: repair(section.content) ?? section.content }
    case 'keyPoints':
      return { ...section, items: section.items.map((item) => repair(item) ?? item) }
    case 'workedExample':
      return {
        ...section,
        question: repair(section.question) ?? section.question,
        solution: repair(section.solution) ?? section.solution,
      }
    default:
      return section
  }
}

/** Repair odd `$` math delimiters across all student-facing lesson strings. */
export function sanitizeLessonMath(lesson: CourseLesson): CourseLesson {
  return {
    ...lesson,
    summary: repair(lesson.summary) ?? lesson.summary,
    learningObjectives: lesson.learningObjectives?.map((o) => repair(o) ?? o),
    simpleExplanation: lesson.simpleExplanation
      ? {
          ...lesson.simpleExplanation,
          summary: repair(lesson.simpleExplanation.summary) ?? lesson.simpleExplanation.summary,
          analogy: repair(lesson.simpleExplanation.analogy),
          steps: lesson.simpleExplanation.steps.map((step) => repair(step) ?? step),
        }
      : lesson.simpleExplanation,
    flashcards: lesson.flashcards?.map((card) => ({
      ...card,
      front: repair(card.front) ?? card.front,
      back: repair(card.back) ?? card.back,
    })),
    faq: lesson.faq?.map((item) => ({
      ...item,
      q: repair(item.q) ?? item.q,
      a: repair(item.a) ?? item.a,
    })),
    sections: lesson.sections.map(repairSection),
  }
}

export function lessonHasOddMathDelimiters(lesson: CourseLesson): boolean {
  const strings: string[] = [lesson.summary]
  if (lesson.simpleExplanation) {
    strings.push(
      lesson.simpleExplanation.summary,
      ...(lesson.simpleExplanation.analogy ? [lesson.simpleExplanation.analogy] : []),
      ...lesson.simpleExplanation.steps
    )
  }
  for (const card of lesson.flashcards ?? []) {
    strings.push(card.front, card.back)
  }
  for (const section of lesson.sections) {
    if ('content' in section && typeof section.content === 'string') strings.push(section.content)
    if (section.type === 'keyPoints') strings.push(...section.items)
    if (section.type === 'workedExample') {
      strings.push(section.question, section.solution)
    }
  }
  return strings.some((s) => s && countUnescapedDollars(s) % 2 === 1)
}
