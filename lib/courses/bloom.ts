/**
 * Bloom levels for lesson retrieval surfaces.
 *
 * Used as quiet authoring/UX labels — not a student-facing taxonomy dashboard.
 * Keep copy short; the verb is the pedagogy.
 */

export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyse'

export const BLOOM_LABEL: Record<BloomLevel, string> = {
  remember: 'Remember',
  understand: 'Understand',
  apply: 'Apply',
  analyse: 'Analyse',
}

/** Default Bloom band per lesson section id. */
export const SECTION_BLOOM: Partial<Record<string, BloomLevel>> = {
  glossary: 'remember',
  cards: 'remember',
  quiz: 'apply',
  teachback: 'understand',
  worked: 'apply',
  practice: 'analyse',
  checkpoint: 'analyse',
}

export function bloomForSection(sectionId: string): BloomLevel | null {
  return SECTION_BLOOM[sectionId] ?? null
}

export function bloomLabelForSection(sectionId: string): string | undefined {
  const level = bloomForSection(sectionId)
  return level ? BLOOM_LABEL[level] : undefined
}
