import type { LessonInteractiveEmbed } from '@/lib/courses/types'
import { hasLessonLiveDiagram } from '@/lib/courses/lesson-diagrams'
import { resolveVisualCatalogSlug } from '@/lib/courses/visual-slug-aliases'

/** GeoGebra material reused as a generic CS placeholder — not topic-specific. */
export const PLACEHOLDER_GEOGEBRA_MATERIALS = new Set(['kQBWnCFC'])

/** Gold-standard topics: keep PhET sim even when a native diagram exists. */
export const PHET_RETAIN_WITH_NATIVE = new Set([
  '22-2-photoelectric-effect',
  '3-5-shapes-of-molecules',
])

export function isPlaceholderInteractiveEmbed(
  embed: LessonInteractiveEmbed | undefined | null
): boolean {
  if (!embed || embed.provider !== 'geogebra') return false
  for (const id of PLACEHOLDER_GEOGEBRA_MATERIALS) {
    if (embed.embedUrl.includes(`material=${id}`)) return true
  }
  return false
}

function retainsPhetWithNative(slug: string): boolean {
  if (PHET_RETAIN_WITH_NATIVE.has(slug)) return true
  const alias = resolveVisualCatalogSlug(slug)
  return alias !== slug && PHET_RETAIN_WITH_NATIVE.has(alias)
}

/** Prefer step-synced native SVG over weak catalog embeds when a diagram exists. */
export function preferNativeDiagramOverPlaceholder(
  slug: string,
  embed: LessonInteractiveEmbed | undefined
): LessonInteractiveEmbed | undefined {
  if (!embed || !hasLessonLiveDiagram(slug)) return embed
  if (isPlaceholderInteractiveEmbed(embed)) return undefined
  if (embed.provider === 'geogebra') return undefined
  if (embed.provider === 'phet' && !retainsPhetWithNative(slug)) return undefined
  return embed
}
