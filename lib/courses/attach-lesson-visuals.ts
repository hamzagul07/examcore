import type { GeneratedLesson } from '@/lib/courses/generator/lesson-schema'
import type { CourseLesson } from '@/lib/courses/types'
import type { LessonDiagramSpec } from '@/lib/courses/diagram-specs'
import { getLessonDiagramSpec } from '@/lib/courses/diagram-specs'
import { getCatalogInteractiveEmbed } from '@/lib/courses/interactive-embeds'
import { embedFromLessonResources } from '@/lib/courses/embed-from-resources'
import { preferNativeDiagramOverPlaceholder } from '@/lib/courses/placeholder-embeds'
import { slugHasVisualCatalogEntry } from '@/lib/courses/visual-catalog'

export function alignDiagramSpecToSteps(
  spec: LessonDiagramSpec,
  stepCount: number
): LessonDiagramSpec {
  if (stepCount <= 0 || spec.steps.length === stepCount) return spec
  if (spec.steps.length > stepCount) {
    return { ...spec, steps: spec.steps.slice(0, stepCount) }
  }
  const steps = [...spec.steps]
  const last = steps[steps.length - 1]
  while (steps.length < stepCount) {
    steps.push({ ...last })
  }
  return { ...spec, steps }
}

/** Synthesise simpleExplanation steps when catalog visuals exist but LLM omitted them. */
export function ensureSimpleExplanationForVisuals(
  lesson: GeneratedLesson
): GeneratedLesson {
  if (lesson.simpleExplanation?.steps?.length) return lesson
  if (!slugHasVisualCatalogEntry(lesson.slug)) return lesson

  const objectives = lesson.learningObjectives ?? []
  const keyPoints = lesson.sections.find((s) => s.type === 'keyPoints')
  const items = keyPoints?.type === 'keyPoints' ? keyPoints.items : []

  const steps =
    items.slice(0, 4).length >= 3
      ? items.slice(0, 4)
      : objectives.slice(0, 4).length >= 3
        ? objectives.slice(0, 4)
        : [
            `Define the core idea of ${lesson.title}.`,
            `Explain the key mechanism or law for ${lesson.topicCode}.`,
            `Apply the main equation or method to a typical exam scenario.`,
            `State one common mistake and how to avoid it in ${lesson.paper}.`,
          ]

  return {
    ...lesson,
    simpleExplanation: {
      title: lesson.title,
      summary: lesson.summary,
      steps,
    },
  }
}

/**
 * Attach curated interactive embeds and diagram specs from catalog when the
 * generator (or hand-authored JSON) did not set them explicitly.
 */
export function attachCatalogVisuals(lesson: GeneratedLesson): GeneratedLesson {
  const out = ensureSimpleExplanationForVisuals(lesson)

  const hasInlineInteractive = out.sections.some((s) => s.type === 'interactive')
  let interactiveEmbed = out.interactiveEmbed
  if (!interactiveEmbed && !hasInlineInteractive) {
    interactiveEmbed = preferNativeDiagramOverPlaceholder(
      out.slug,
      getCatalogInteractiveEmbed(out.slug) ?? embedFromLessonResources(out) ?? undefined
    )
  } else if (interactiveEmbed) {
    interactiveEmbed = preferNativeDiagramOverPlaceholder(out.slug, interactiveEmbed)
  }

  let diagramSpec = out.diagramSpec
  if (!diagramSpec) {
    const catalogSpec = getLessonDiagramSpec(out.slug)
    if (catalogSpec) {
      const stepCount = out.simpleExplanation?.steps.length
      diagramSpec = stepCount
        ? alignDiagramSpecToSteps(catalogSpec, stepCount)
        : catalogSpec
    }
  }

  if (!interactiveEmbed && !diagramSpec && out === lesson) return lesson

  const { interactiveEmbed: _removedEmbed, ...rest } = out
  return {
    ...rest,
    ...(interactiveEmbed ? { interactiveEmbed } : {}),
    ...(diagramSpec ? { diagramSpec } : {}),
  }
}

/** Runtime hydration for hand-authored or outline lessons (mirrors generator post-process). */
export function hydrateLessonCatalogVisuals(lesson: CourseLesson): CourseLesson {
  return attachCatalogVisuals(lesson as GeneratedLesson) as CourseLesson
}
