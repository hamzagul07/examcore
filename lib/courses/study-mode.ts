import type { StageId } from '@/lib/courses/lesson-stages'

/**
 * Study mode maps lesson sections to a learning path for analytics / TOC
 * stage chips. The live UX is immersive full-screen reading of the same
 * document — not a hide/show wizard. Content always stays in the DOM for SEO.
 */

/** Section id → the stage it belongs to. Order within a stage follows the page. */
const SECTION_STAGE: Record<string, StageId> = {
  simple: 'orient',
  syllabus: 'orient',
  criteria: 'orient',

  visual: 'see',
  figures: 'see',

  formulas: 'read',
  compare: 'read',
  notes: 'read',
  cmap: 'read',
  glossary: 'read',

  quiz: 'check',
  teachback: 'check',
  cards: 'check',

  worked: 'prove',
  checkpoint: 'prove',
  takeaways: 'prove',
  practice: 'prove',
  resources: 'prove',
  faqs: 'prove',
}

export const STAGE_ORDER: readonly StageId[] = ['orient', 'see', 'read', 'check', 'prove']

export const STAGE_LABEL: Record<StageId, string> = {
  orient: 'Get set',
  see: 'See it',
  read: 'Read',
  check: 'Check yourself',
  prove: 'Prove it',
}

export const STAGE_STRIP: Record<StageId, string> = {
  orient: 'Get set',
  see: 'See it',
  read: 'Read',
  check: 'Check',
  prove: 'Prove',
}

export const STAGE_SUB: Record<StageId, string> = {
  orient: 'what this topic is',
  see: 'picture the idea',
  read: 'the notes & terms',
  check: 'write before you look',
  prove: 'a real exam question',
}

export const STAGE_COACH: Record<StageId, string> = {
  orient: 'Skim the big idea — don’t memorise yet.',
  see: 'Watch how it moves. Then the notes will stick.',
  read: 'Read once carefully. Checking comes next.',
  check: 'Produce answers. Gaps here are marks you’d lose.',
  prove: 'Mark a real question — that closes the loop.',
}

export function stageForSection(id: string): StageId | null {
  return SECTION_STAGE[id] ?? null
}

export function mappedSectionIds(): string[] {
  return Object.keys(SECTION_STAGE)
}

export function stagesPresent(sectionIds: readonly string[]): StageId[] {
  const present = new Set<StageId>()
  for (const id of sectionIds) {
    const stage = stageForSection(id)
    if (stage) present.add(stage)
  }
  return STAGE_ORDER.filter((s) => present.has(s))
}

/** Kept for mapping honesty in tests — immersion shows every section. */
export function isSectionVisible(sectionId: string, activeStage: StageId | null): boolean {
  if (!activeStage) return true
  const stage = stageForSection(sectionId)
  if (!stage) return true
  return stage === activeStage
}

export function stepStage(
  stages: readonly StageId[],
  current: StageId,
  delta: number
): StageId {
  const i = stages.indexOf(current)
  if (i === -1) return stages[0] ?? current
  const next = Math.min(Math.max(0, i + delta), stages.length - 1)
  return stages[next] ?? current
}

export function firstSectionForStage(
  sectionIds: readonly string[],
  stage: StageId
): string | null {
  return sectionIds.find((id) => stageForSection(id) === stage) ?? null
}

export function stageChapterMark(
  sectionId: string,
  sectionIds: readonly string[],
  stages: readonly StageId[]
): { label: string; first: boolean } | null {
  const stage = stageForSection(sectionId)
  if (!stage || !stages.includes(stage)) return null
  if (firstSectionForStage(sectionIds, stage) !== sectionId) return null
  const n = stages.indexOf(stage)
  return {
    label: `${String(n + 1).padStart(2, '0')} · ${STAGE_LABEL[stage].toUpperCase()}`,
    first: n === 0,
  }
}

export const STUDY_PREF_KEY = 'ms:study-mode'

export const CHECK_RETRIEVAL_IDS = ['quiz', 'teachback', 'cards'] as const
