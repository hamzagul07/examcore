import { DIAGRAM_SPEC_SLUGS, getLessonDiagramSpec } from '@/lib/courses/diagram-specs'
import { INTERACTIVE_EMBED_CATALOG, getCatalogInteractiveEmbed } from '@/lib/courses/interactive-embeds'

export const INTERACTIVE_EMBED_SLUGS = Object.keys(INTERACTIVE_EMBED_CATALOG)

export function listDiagramSpecSlugs(): string[] {
  return DIAGRAM_SPEC_SLUGS
}

export function slugHasVisualCatalogEntry(slug: string): boolean {
  return getCatalogInteractiveEmbed(slug) !== undefined || getLessonDiagramSpec(slug) !== null
}

/** Prompt block: tells the LLM how visuals attach and what to generate. */
export function buildVisualAuthoringGuide(slug: string): string {
  const hasEmbed = getCatalogInteractiveEmbed(slug) !== undefined
  const hasSpec = getLessonDiagramSpec(slug) !== null
  if (!hasEmbed && !hasSpec) {
    return `Visuals: no curated interactive for slug "${slug}". Still include simpleExplanation with 3–5 clear steps — they power the step carousel.`
  }

  const lines = [
    'Visual learning (IMPORTANT):',
    '- Include simpleExplanation with exactly 4 steps (short, ordered, exam-focused). Steps sync to the live diagram and/or PhET/GeoGebra sim.',
    '- Do NOT output interactiveEmbed or diagramSpec unless you need a custom override — the server attaches curated visuals for this topic from catalog.',
  ]
  if (hasEmbed) lines.push('- This topic has a curated PhET/GeoGebra embed (auto-attached post-generation).')
  if (hasSpec) lines.push('- This topic has step-synced diagram layers and optional parameter sliders (auto-attached post-generation).')
  lines.push('- Each simpleExplanation step should match one conceptual beat (definition → mechanism → equation → exam application).')
  return lines.join('\n')
}

export function subjectDisplayName(subjectCode: string): string {
  switch (subjectCode) {
    case '9709':
      return 'Mathematics'
    case '9700':
      return 'Biology'
    case '9701':
      return 'Chemistry'
    case '9708':
      return 'Economics'
    case '9618':
      return 'Computer Science'
    case '9609':
      return 'Business'
    default:
      return 'Physics'
  }
}
