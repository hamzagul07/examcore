import type { CourseLesson } from '@/lib/courses/types'
import { hasLessonLiveDiagram } from '@/lib/courses/lesson-diagrams'
import { resolveLessonInteractiveEmbed } from '@/lib/courses/interactive-embeds'
import { isDualVisualSlug } from '@/lib/courses/placeholder-embeds'

export type LessonHeroVisual =
  | { kind: 'embed'; label: string }
  | { kind: 'native-diagram'; label: string }
  | { kind: 'dual-visual'; label: string }
  | { kind: 'template' }

function embedLabel(provider: string): string {
  if (provider === 'phet') return 'PhET simulation'
  if (provider === 'geogebra') return 'GeoGebra activity'
  return 'interactive simulation'
}

/** Hero callout for lesson pages — embed, native diagram, or generic template visual. */
export function resolveLessonHeroVisual(lesson: CourseLesson): LessonHeroVisual {
  const embed = resolveLessonInteractiveEmbed(lesson)
  if (embed && isDualVisualSlug(lesson.slug)) {
    return {
      kind: 'dual-visual',
      label: 'PhET simulation plus step-synced diagram — scroll to Explore the concept.',
    }
  }
  if (embed) {
    return {
      kind: 'embed',
      label: `Includes a live ${embedLabel(embed.provider)} — scroll to Explore the concept.`,
    }
  }
  if (hasLessonLiveDiagram(lesson.slug)) {
    return {
      kind: 'native-diagram',
      label: 'Includes a step-synced live diagram — scroll to Explore the concept.',
    }
  }
  return { kind: 'template' }
}
