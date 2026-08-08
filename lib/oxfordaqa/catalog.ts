/**
 * OxfordAQA International catalog (Phase E4 shell).
 * Config-driven proof that a new board is not a product rewrite.
 */

export type OxfordaqaQualificationId = 'international-a-level' | 'international-gcse'

export type OxfordaqaPaper = {
  /** URL segment, e.g. paper-1 */
  slug: string
  name: string
  short: string
}

export type OxfordaqaSubject = {
  slug: string
  name: string
  /** Internal content code claimed by the adapter (oxaqa-*). */
  contentCode: string
  qualification: OxfordaqaQualificationId
  group: 'Mathematics' | 'Sciences' | 'Humanities' | 'Other'
  blurb: string
  papers: OxfordaqaPaper[]
  markingWave: 1 | 1.5 | 2
  shellEnabled: boolean
}

const IAL_SUBJECTS: OxfordaqaSubject[] = [
  {
    slug: 'mathematics',
    name: 'Mathematics',
    contentCode: 'oxaqa-mathematics',
    qualification: 'international-a-level',
    group: 'Mathematics',
    blurb:
      'OxfordAQA International A-level Mathematics is a linear qualification with papers that reward clear method and accurate algebra. MarkScheme will attach examiner-style marking after the Edexcel IAL Maths experiment converts.',
    markingWave: 1,
    shellEnabled: true,
    papers: [
      { slug: 'paper-1', name: 'Paper 1', short: 'P1' },
      { slug: 'paper-2', name: 'Paper 2', short: 'P2' },
      { slug: 'paper-3', name: 'Paper 3', short: 'P3' },
    ],
  },
  {
    slug: 'physics',
    name: 'Physics',
    contentCode: 'oxaqa-physics',
    qualification: 'international-a-level',
    group: 'Sciences',
    blurb:
      'OxfordAQA International A-level Physics covers mechanics, fields, waves and practical skills across linear papers — strong fit for equation, unit and significant-figure marking.',
    markingWave: 1,
    shellEnabled: true,
    papers: [
      { slug: 'paper-1', name: 'Paper 1', short: 'P1' },
      { slug: 'paper-2', name: 'Paper 2', short: 'P2' },
      { slug: 'paper-3', name: 'Paper 3', short: 'P3' },
    ],
  },
  {
    slug: 'chemistry',
    name: 'Chemistry',
    contentCode: 'oxaqa-chemistry',
    qualification: 'international-a-level',
    group: 'Sciences',
    blurb:
      'OxfordAQA International A-level Chemistry spans physical, inorganic and organic chemistry with linear end-of-course papers.',
    markingWave: 1,
    shellEnabled: true,
    papers: [
      { slug: 'paper-1', name: 'Paper 1', short: 'P1' },
      { slug: 'paper-2', name: 'Paper 2', short: 'P2' },
      { slug: 'paper-3', name: 'Paper 3', short: 'P3' },
    ],
  },
  {
    slug: 'biology',
    name: 'Biology',
    contentCode: 'oxaqa-biology',
    qualification: 'international-a-level',
    group: 'Sciences',
    blurb:
      'OxfordAQA International A-level Biology covers molecules to ecosystems. Phrase-level mark-scheme matching comes after STEM maths/physics/chem conversion.',
    markingWave: 1.5,
    shellEnabled: true,
    papers: [
      { slug: 'paper-1', name: 'Paper 1', short: 'P1' },
      { slug: 'paper-2', name: 'Paper 2', short: 'P2' },
      { slug: 'paper-3', name: 'Paper 3', short: 'P3' },
    ],
  },
]

export const OXFORD_AQA_QUALIFICATIONS: {
  id: OxfordaqaQualificationId
  slug: OxfordaqaQualificationId
  label: string
  shortLabel: string
  shellEnabled: boolean
  blurb: string
}[] = [
  {
    id: 'international-a-level',
    slug: 'international-a-level',
    label: 'International A-level',
    shortLabel: 'IAL',
    shellEnabled: true,
    blurb:
      'Linear International A-levels from OxfordAQA — growing footprint, thinly served online compared with Cambridge and Edexcel.',
  },
  {
    id: 'international-gcse',
    slug: 'international-gcse',
    label: 'International GCSE',
    shortLabel: 'IGCSE',
    shellEnabled: true,
    blurb:
      'International GCSE discovery shell. Full subject packs follow after IAL conversion is proven.',
  },
]

export function getOxfordaqaSubjects(
  qualification?: OxfordaqaQualificationId
): OxfordaqaSubject[] {
  const all = IAL_SUBJECTS.filter((s) => s.shellEnabled)
  if (!qualification) return all
  return all.filter((s) => s.qualification === qualification)
}

export function getOxfordaqaSubject(
  qualification: string,
  subjectSlug: string
): OxfordaqaSubject | null {
  return (
    getOxfordaqaSubjects().find(
      (s) => s.qualification === qualification && s.slug === subjectSlug
    ) ?? null
  )
}

export function getOxfordaqaQualification(slug: string) {
  return OXFORD_AQA_QUALIFICATIONS.find((q) => q.slug === slug) ?? null
}

export function getOxfordaqaContentCodes(): string[] {
  return getOxfordaqaSubjects().map((s) => s.contentCode)
}

export function isOxfordaqaContentCode(code: string): boolean {
  const lower = code.trim().toLowerCase()
  return getOxfordaqaContentCodes().includes(lower)
}
