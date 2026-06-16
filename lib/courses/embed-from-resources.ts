import type { CourseLesson, LessonInteractiveEmbed } from '@/lib/courses/types'
import {
  geogebraEmbedUrl,
  geogebraMaterialPageUrl,
  phetCheerpjEmbedUrl,
  phetHtml5EmbedUrl,
  phetSimPageUrl,
} from '@/lib/courses/interactive-embeds'

const PHET_ATTRIBUTION = {
  source: 'PhET Interactive Simulations, University of Colorado Boulder',
  license: 'CC BY 4.0',
  sourceUrl: 'https://phet.colorado.edu',
} as const

const GEOGEBRA_ATTRIBUTION = {
  source: 'GeoGebra',
  license: 'GeoGebra Terms of Service',
  sourceUrl: 'https://www.geogebra.org',
} as const

/** Legacy PhET page slugs that differ from embed folder names. */
const PHET_SIM_ALIASES: Record<string, string> = {
  'photoelectric-effect': 'photoelectric',
}

/** Java-ported sims that need CheerpJ embed path. */
const PHET_CHEERPJ_SIMS = new Set(['photoelectric'])

export function parsePhetSimId(href: string): string | null {
  const pageMatch = href.match(/phet\.colorado\.edu\/en\/simulations\/([a-z0-9-]+)/i)
  if (pageMatch) return PHET_SIM_ALIASES[pageMatch[1]] ?? pageMatch[1]

  const htmlMatch = href.match(/phet\.colorado\.edu\/sims\/html\/([a-z0-9-]+)\//i)
  if (htmlMatch) return htmlMatch[1]

  const cheerpjMatch = href.match(/phet\.colorado\.edu\/sims\/cheerpj\/([a-z0-9-]+)\//i)
  if (cheerpjMatch) return cheerpjMatch[1]

  return null
}

export function parseGeogebraMaterialId(href: string): string | null {
  const material = href.match(/[?&]material=([^&]+)/)
  if (material) return material[1]

  const mPath = href.match(/geogebra\.org\/m\/([^/?]+)/i)
  if (mPath) return mPath[1]

  const showId = href.match(/material\/show\/id\/([^/?]+)/i)
  if (showId) return showId[1]

  return null
}

function cleanResourceLabel(label: string): string {
  return label
    .replace(/^PhET\s*(Interactive\s*)?Simulation[:：]\s*/i, '')
    .replace(/^GeoGebra[:：]\s*/i, '')
    .trim()
}

export function phetEmbedFromUrl(
  label: string,
  href: string,
  hint?: string
): LessonInteractiveEmbed | null {
  const simId = parsePhetSimId(href)
  if (!simId) return null

  const cheerpj = PHET_CHEERPJ_SIMS.has(simId)
  const title = cleanResourceLabel(label) || simId

  return {
    provider: 'phet',
    title,
    embedUrl: cheerpj ? phetCheerpjEmbedUrl(simId) : phetHtml5EmbedUrl(simId),
    launchUrl: phetSimPageUrl(simId),
    hint:
      hint ??
      `Explore “${title}” — drag sliders and watch how the model responds in real time.`,
    aspectRatio: '834 / 504',
    attribution: PHET_ATTRIBUTION,
  }
}

export function geogebraEmbedFromUrl(
  label: string,
  href: string,
  hint?: string
): LessonInteractiveEmbed | null {
  const materialId = parseGeogebraMaterialId(href)
  if (!materialId) return null

  const title = cleanResourceLabel(label) || 'GeoGebra activity'

  return {
    provider: 'geogebra',
    title,
    embedUrl: geogebraEmbedUrl(materialId),
    launchUrl: geogebraMaterialPageUrl(materialId),
    hint:
      hint ??
      `Use “${title}” — shift curves or drag points to see equilibrium and slopes change.`,
    aspectRatio: '834 / 504',
    attribution: GEOGEBRA_ATTRIBUTION,
  }
}

function resourceItems(lesson: CourseLesson) {
  const items: { label: string; href: string }[] = []
  for (const section of lesson.sections) {
    if (section.type !== 'resources') continue
    for (const item of section.items) {
      if (item.href) items.push({ label: item.label, href: item.href })
    }
  }
  return items
}

/** First PhET or GeoGebra link in lesson resources → inline embed. */
export function embedFromLessonResources(lesson: CourseLesson): LessonInteractiveEmbed | null {
  for (const item of resourceItems(lesson)) {
    if (item.href.includes('phet.colorado.edu')) {
      const embed = phetEmbedFromUrl(item.label, item.href)
      if (embed) return embed
    }
  }
  for (const item of resourceItems(lesson)) {
    if (item.href.includes('geogebra.org')) {
      const embed = geogebraEmbedFromUrl(item.label, item.href)
      if (embed) return embed
    }
  }
  return null
}

export function embedMatchesResource(
  embed: LessonInteractiveEmbed,
  href: string
): boolean {
  if (embed.provider === 'phet') {
    const simId = parsePhetSimId(href)
    if (!simId) return false
    return embed.embedUrl.includes(`/${simId}/`) || embed.launchUrl?.includes(simId) === true
  }
  if (embed.provider === 'geogebra') {
    const materialId = parseGeogebraMaterialId(href)
    if (!materialId) return false
    return embed.embedUrl.includes(`material=${materialId}`)
  }
  return embed.embedUrl === href || embed.launchUrl === href
}

/** Drop resource links already promoted to the inline visual embed. */
export function filterResourcesForPromotedEmbed(
  items: { label: string; href: string }[] | undefined,
  embed: LessonInteractiveEmbed | null | undefined
): { label: string; href: string }[] | undefined {
  if (!items?.length) return items
  if (!embed) return items
  const filtered = items.filter((item) => !embedMatchesResource(embed, item.href))
  return filtered.length ? filtered : undefined
}
