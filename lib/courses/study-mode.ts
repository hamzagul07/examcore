import type { StageId } from '@/lib/courses/lesson-stages'

/**
 * Study mode: the same lesson, presented one stage at a time.
 *
 * Critically this is a PRESENTATION mode, not a second renderer. Every section
 * still renders into the DOM exactly as it does today and inactive ones are
 * hidden in CSS, so the served HTML — and therefore the 871 indexed lesson URLs
 * — are completely unchanged. The prototype at /dev/lesson-path rendered only
 * the active stage, which would have hidden four fifths of the content from
 * crawlers; that is why it stayed a prototype.
 *
 * Pure, so the section→stage mapping is testable and every section is provably
 * accounted for. A section that belonged to no stage would simply vanish in
 * study mode, which is the failure worth guarding against.
 */

/** Section id → the stage it belongs to. Order within a stage follows the page. */
const SECTION_STAGE: Record<string, StageId> = {
  simple: 'orient',
  syllabus: 'orient',
  criteria: 'orient',

  visual: 'see',

  formulas: 'read',
  compare: 'read',
  notes: 'read',
  cmap: 'read',

  glossary: 'check',
  quiz: 'check',
  cards: 'check',

  worked: 'prove',
  checkpoint: 'prove',
  takeaways: 'prove',
  practice: 'prove',
  resources: 'prove',
  faqs: 'prove',
}

export const STAGE_ORDER: readonly StageId[] = ['orient', 'see', 'read', 'check', 'prove']

export function stageForSection(id: string): StageId | null {
  return SECTION_STAGE[id] ?? null
}

/** Every section id the mapping knows — used by the test to prove coverage. */
export function mappedSectionIds(): string[] {
  return Object.keys(SECTION_STAGE)
}

/**
 * The stages this lesson actually has, in order.
 *
 * Built from the sections present rather than a fixed list, so a lesson with no
 * diagram never shows an empty "See" step.
 */
export function stagesPresent(sectionIds: readonly string[]): StageId[] {
  const present = new Set<StageId>()
  for (const id of sectionIds) {
    const stage = stageForSection(id)
    if (stage) present.add(stage)
  }
  return STAGE_ORDER.filter((s) => present.has(s))
}

/**
 * Sections that belong to no stage are shown in EVERY stage rather than hidden.
 *
 * Failing open matters here: a section added later without a mapping entry
 * should look slightly out of place, not disappear from the lesson entirely.
 */
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

/**
 * The preference is remembered globally, not per lesson.
 *
 * Somebody who wants to be walked through one lesson wants it for the next one
 * too; making them re-enable it every time would make the mode feel like a toy.
 */
export const STUDY_PREF_KEY = 'ms:study-mode'

export const STAGE_LABEL: Record<StageId, string> = {
  orient: 'Orient',
  see: 'See',
  read: 'Read',
  check: 'Check',
  prove: 'Prove',
}
