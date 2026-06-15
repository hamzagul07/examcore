import type { LessonInteractiveEmbed } from '@/lib/courses/types'
import { hasLessonLiveDiagram } from '@/lib/courses/lesson-diagrams'

/** GeoGebra material reused as a generic CS placeholder — not topic-specific. */
export const PLACEHOLDER_GEOGEBRA_MATERIALS = new Set(['kQBWnCFC'])

export function isPlaceholderInteractiveEmbed(
  embed: LessonInteractiveEmbed | undefined | null
): boolean {
  if (!embed || embed.provider !== 'geogebra') return false
  for (const id of PLACEHOLDER_GEOGEBRA_MATERIALS) {
    if (embed.embedUrl.includes(`material=${id}`)) return true
  }
  return false
}

/** Prefer step-synced native SVG when catalog embed is a generic placeholder. */
export function preferNativeDiagramOverPlaceholder(
  slug: string,
  embed: LessonInteractiveEmbed | undefined
): LessonInteractiveEmbed | undefined {
  if (embed && isPlaceholderInteractiveEmbed(embed) && hasLessonLiveDiagram(slug)) {
    return undefined
  }
  return embed
}
