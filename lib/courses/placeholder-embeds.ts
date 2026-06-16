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

/** Topics with a native diagram that can pair with an inline sim. */
export function isDualVisualSlug(slug: string): boolean {
  return hasLessonLiveDiagram(slug)
}

/** Drop only generic CS placeholder embeds — keep real PhET/GeoGebra sims. */
export function preferNativeDiagramOverPlaceholder(
  _slug: string,
  embed: LessonInteractiveEmbed | undefined
): LessonInteractiveEmbed | undefined {
  if (!embed) return embed
  if (isPlaceholderInteractiveEmbed(embed)) return undefined
  return embed
}
