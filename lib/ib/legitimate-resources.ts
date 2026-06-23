/**
 * Legitimate free IBDP resources for lesson `resources` sections.
 * Official IBO specimens + teacher-authored free notes only — no pirate repos.
 * @see https://www.ibo.org/programmes/diploma-programme/assessment-and-exams/sample-exam-papers/
 */

export type IbLegitResource = { label: string; href: string; note?: string }

const IBO_SPECIMENS: IbLegitResource = {
  label: 'IBO sample & specimen papers',
  href: 'https://www.ibo.org/programmes/diploma-programme/assessment-and-exams/sample-exam-papers/',
  note: 'Official past/specimen papers with markschemes where published.',
}

const REVISION_DOJO: IbLegitResource = {
  label: 'RevisionDojo predicted papers',
  href: 'https://revisiondojo.com/predicted-papers',
  note: 'Exam-style practice with mark schemes (original content, not redistributed IB papers).',
}

const IB_ACADEMY: IbLegitResource = {
  label: 'IB Academy study guides',
  href: 'https://www.ib.academy',
  note: 'Free study guides across DP subjects.',
}

const IB_RESOURCES_HUB: IbLegitResource = {
  label: 'ibResources directory',
  href: 'https://ibresources.cc',
  note: 'Community-maintained index of legal free notes and tools.',
}

/** Suggested external links per subject code (for lesson authors / prompts). */
export const IB_LEGIT_RESOURCES: Record<string, IbLegitResource[]> = {
  'ib-tok': [IBO_SPECIMENS, IB_ACADEMY, IB_RESOURCES_HUB],
  'ib-extended-essay': [IBO_SPECIMENS, IB_ACADEMY],
  'ib-cas': [IB_ACADEMY],
  'ib-visual-arts-hl': [IBO_SPECIMENS, IB_ACADEMY],
  'ib-visual-arts-sl': [IBO_SPECIMENS, IB_ACADEMY],
  'ib-theatre-hl': [IBO_SPECIMENS, IB_ACADEMY],
  'ib-theatre-sl': [IBO_SPECIMENS, IB_ACADEMY],
  'ib-music-hl': [IBO_SPECIMENS, IB_ACADEMY],
  'ib-music-sl': [IBO_SPECIMENS, IB_ACADEMY],
  'ib-film-hl': [IBO_SPECIMENS, IB_ACADEMY],
  'ib-film-sl': [IBO_SPECIMENS, IB_ACADEMY],
  'ib-dance-hl': [IBO_SPECIMENS, IB_ACADEMY],
  'ib-dance-sl': [IBO_SPECIMENS, IB_ACADEMY],
  'ib-biology-hl': [IBO_SPECIMENS, { label: 'BioNinja', href: 'https://ib.bioninja.com.au' }, REVISION_DOJO],
  'ib-chemistry-hl': [IBO_SPECIMENS, { label: 'Richard Thornley (Chemistry)', href: 'https://www.youtube.com/user/richardthornley' }, REVISION_DOJO],
  'ib-maths-aa-hl': [IBO_SPECIMENS, { label: 'Christos Nikolaidis (Math)', href: 'https://www.christosnikolaidis.com' }, REVISION_DOJO],
  'ib-maths-ai-hl': [IBO_SPECIMENS, { label: 'Christos Nikolaidis (Math)', href: 'https://www.christosnikolaidis.com' }, REVISION_DOJO],
  'ib-computer-science-hl': [IBO_SPECIMENS, { label: 'Paul Baumgarten CS notes', href: 'https://pbaumgarten.github.io' }],
  'ib-economics-hl': [IBO_SPECIMENS, { label: 'EconplusDal', href: 'https://www.econplusdal.com' }, REVISION_DOJO],
}

export function legitResourcesForSubject(subjectCode: string): IbLegitResource[] {
  return IB_LEGIT_RESOURCES[subjectCode] ?? [IBO_SPECIMENS, IB_ACADEMY, IB_RESOURCES_HUB]
}

export function formatLegitResourcesForPrompt(subjectCode: string): string {
  return legitResourcesForSubject(subjectCode)
    .map((r) => `- ${r.label}: ${r.href}${r.note ? ` (${r.note})` : ''}`)
    .join('\n')
}
