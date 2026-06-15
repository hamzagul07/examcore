import type { CourseLesson, SimpleExplanation } from './types'
import { getLessonDiagramSpec } from './diagram-specs'
import { getCatalogInteractiveEmbed } from './interactive-embeds'

/** Build 4 student-facing steps from catalog diagram spec + embed hint. */
export function stepsFromCatalogSpec(slug: string, topicTitle: string): string[] | null {
  const spec = getLessonDiagramSpec(slug)
  if (!spec?.steps.length) return null

  const steps = spec.steps.slice(0, 4).map((s, i) => {
    const hint = s.embedHint ?? s.caption ?? ''
    const caption = s.caption ?? hint
    if (hint && caption !== hint) {
      return `${caption} ${hint.endsWith('.') ? hint : hint + '.'}`
    }
    return caption || `Step ${i + 1}: explore ${topicTitle}.`
  })

  while (steps.length < 4) {
    steps.push(`Apply ${topicTitle} to a typical ${slug.split('-')[0]} past-paper scenario.`)
  }
  return steps.slice(0, 4)
}

export function syncLessonStepsToCatalog(lesson: CourseLesson): CourseLesson {
  const slug = lesson.slug
  const catalogSteps = stepsFromCatalogSpec(slug, lesson.title)
  if (!catalogSteps) return lesson

  const current = lesson.simpleExplanation?.steps ?? []
  const allGeneric = current.length === 0 || current.every((s) =>
    /^Identify the key definitions|^Link the concept to a diagram|^Apply the idea to a structured|^Mark your attempt strictly/.test(
      s.trim()
    )
  )

  if (!allGeneric && current.length === 4) return lesson

  const simpleExplanation: SimpleExplanation = {
    title: lesson.simpleExplanation?.title ?? `${lesson.title} — step by step`,
    summary:
      lesson.simpleExplanation?.summary ??
      `Use the live simulation below while following these four steps for ${lesson.title}.`,
    analogy: lesson.simpleExplanation?.analogy,
    steps: catalogSteps,
  }

  return { ...lesson, simpleExplanation }
}

export function lessonHasCatalogVisual(slug: string): boolean {
  return getCatalogInteractiveEmbed(slug) !== undefined || getLessonDiagramSpec(slug) !== null
}
