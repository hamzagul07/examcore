/**
 * Selective UK AQA A-level catalog (Phase E5) — Maths + Physics only.
 */

export type AqaSubject = {
  slug: string
  name: string
  contentCode: string
  group: 'Mathematics' | 'Sciences'
  blurb: string
  markingWave: 1 | 2
  shellEnabled: boolean
}

const A_LEVEL_SUBJECTS: AqaSubject[] = [
  {
    slug: 'mathematics',
    name: 'Mathematics',
    contentCode: 'aqa-mathematics',
    group: 'Mathematics',
    blurb:
      'AQA A-level Mathematics (UK) — linear papers with clear method and accuracy marks. MarkScheme starts with practice marking; past-paper banks follow demand.',
    markingWave: 1,
    shellEnabled: true,
  },
  {
    slug: 'physics',
    name: 'Physics',
    contentCode: 'aqa-physics',
    group: 'Sciences',
    blurb:
      'AQA A-level Physics (UK) — equations, units and significant figures across linear papers.',
    markingWave: 1,
    shellEnabled: true,
  },
]

export function getAqaSubjects(): AqaSubject[] {
  return A_LEVEL_SUBJECTS.filter((s) => s.shellEnabled)
}

export function getAqaSubject(slug: string): AqaSubject | null {
  return getAqaSubjects().find((s) => s.slug === slug) ?? null
}

export function isAqaContentCode(code: string): boolean {
  const c = code.trim().toLowerCase()
  return c.startsWith('aqa-') || getAqaSubjects().some((s) => s.contentCode === c)
}
