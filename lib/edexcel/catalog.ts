/**
 * Pearson Edexcel International catalog (Phase E1 shell).
 * Config-driven — Board Expansion Engine ingests this rather than hardcoding routes.
 */

export type EdexcelQualificationId = 'international-a-level' | 'international-gcse'

export type EdexcelUnit = {
  code: string
  name: string
  /** Short label for cards, e.g. "Pure 1" */
  short: string
}

export type EdexcelSubject = {
  slug: string
  name: string
  /** Informal subject family code used in SEO (not always a Pearson code) */
  familyCode: string
  qualification: EdexcelQualificationId
  group: 'Mathematics' | 'Sciences' | 'Humanities' | 'Other'
  blurb: string
  units: EdexcelUnit[]
  /** Wave for marking rollout — 1 = Maths/Physics/Chem, 1.5 = Biology */
  markingWave: 1 | 1.5 | 2
  shellEnabled: boolean
}

const IAL_SUBJECTS: EdexcelSubject[] = [
  {
    slug: 'mathematics',
    name: 'Mathematics',
    familyCode: 'WMA',
    qualification: 'international-a-level',
    group: 'Mathematics',
    blurb:
      'Edexcel International A Level Mathematics is modular: Pure, Mechanics and Statistics units combine into an overall grade via UMS. MarkScheme focuses on method marks, equivalent working and dependent accuracy marks.',
    markingWave: 1,
    shellEnabled: true,
    units: [
      { code: 'WMA11', name: 'Pure Mathematics 1', short: 'Pure 1' },
      { code: 'WMA12', name: 'Pure Mathematics 2', short: 'Pure 2' },
      { code: 'WMA13', name: 'Pure Mathematics 3', short: 'Pure 3' },
      { code: 'WMA14', name: 'Pure Mathematics 4', short: 'Pure 4' },
      { code: 'WME01', name: 'Mechanics 1', short: 'Mechanics 1' },
      { code: 'WME02', name: 'Mechanics 2', short: 'Mechanics 2' },
      { code: 'WST01', name: 'Statistics 1', short: 'Statistics 1' },
      { code: 'WST02', name: 'Statistics 2', short: 'Statistics 2' },
    ],
  },
  {
    slug: 'physics',
    name: 'Physics',
    familyCode: 'WPH',
    qualification: 'international-a-level',
    group: 'Sciences',
    blurb:
      'Edexcel IAL Physics is assessed across modular units covering mechanics, waves, electricity, fields and experimental skills. Strong fit for equation, unit and significant-figure marking.',
    markingWave: 1,
    shellEnabled: true,
    units: [
      { code: 'WPH11', name: 'Physics on the Go', short: 'Unit 1' },
      { code: 'WPH12', name: 'Physics at Work', short: 'Unit 2' },
      { code: 'WPH13', name: 'Exploring Physics', short: 'Unit 3' },
      { code: 'WPH14', name: 'Physics on the Move', short: 'Unit 4' },
      { code: 'WPH15', name: 'Physics from Creation to Collapse', short: 'Unit 5' },
      { code: 'WPH16', name: 'Experimental Physics', short: 'Unit 6' },
    ],
  },
  {
    slug: 'chemistry',
    name: 'Chemistry',
    familyCode: 'WCH',
    qualification: 'international-a-level',
    group: 'Sciences',
    blurb:
      'Edexcel IAL Chemistry units span physical, inorganic and organic chemistry plus practical skills. Calculations, equations and precise terminology drive most method marks.',
    markingWave: 1,
    shellEnabled: true,
    units: [
      { code: 'WCH11', name: 'Structure, Bonding and Introduction to Organic Chemistry', short: 'Unit 1' },
      { code: 'WCH12', name: 'Energetics, Group Chemistry, Halogenoalkanes and Alcohols', short: 'Unit 2' },
      { code: 'WCH13', name: 'Practical Skills in Chemistry I', short: 'Unit 3' },
      { code: 'WCH14', name: 'Rates, Equilibria and Further Organic Chemistry', short: 'Unit 4' },
      { code: 'WCH15', name: 'Transition Metals and Organic Nitrogen Chemistry', short: 'Unit 5' },
      { code: 'WCH16', name: 'Practical Skills in Chemistry II', short: 'Unit 6' },
    ],
  },
  {
    slug: 'biology',
    name: 'Biology',
    familyCode: 'WBI',
    qualification: 'international-a-level',
    group: 'Sciences',
    blurb:
      'Edexcel IAL Biology covers molecules, cells, exchange, genetics, energy and ecology across modular units. Marking leans on phrase-level mark-scheme matching — Wave 1.5 after STEM maths/physics/chem.',
    markingWave: 1.5,
    shellEnabled: true,
    units: [
      { code: 'WBI11', name: 'Molecules, Diet, Transport and Health', short: 'Unit 1' },
      { code: 'WBI12', name: 'Cells, Development, Biodiversity and Conservation', short: 'Unit 2' },
      { code: 'WBI13', name: 'Practical Skills in Biology I', short: 'Unit 3' },
      { code: 'WBI14', name: 'Energy, Environment, Microbiology and Immunity', short: 'Unit 4' },
      { code: 'WBI15', name: 'Respiration, Internal Environment, Coordination and Gene Technology', short: 'Unit 5' },
      { code: 'WBI16', name: 'Practical Skills in Biology II', short: 'Unit 6' },
    ],
  },
]

export const EDEXCEL_QUALIFICATIONS: {
  id: EdexcelQualificationId
  slug: EdexcelQualificationId
  label: string
  shortLabel: string
  shellEnabled: boolean
  blurb: string
}[] = [
  {
    id: 'international-a-level',
    slug: 'international-a-level',
    label: 'International A Level',
    shortLabel: 'IAL',
    shellEnabled: true,
    blurb:
      'Modular International A Levels with unit exams and UMS grading — the closest board extension from Cambridge for international schools.',
  },
  {
    id: 'international-gcse',
    slug: 'international-gcse',
    label: 'International GCSE',
    shortLabel: 'IGCSE',
    shellEnabled: true,
    blurb:
      'International GCSE shell for discovery and grade-boundary tools. Full subject packs follow after IAL marking converts.',
  },
]

export function getEdexcelSubjects(qualification?: EdexcelQualificationId): EdexcelSubject[] {
  const all = IAL_SUBJECTS.filter((s) => s.shellEnabled)
  if (!qualification) return all
  return all.filter((s) => s.qualification === qualification)
}

export function getEdexcelSubject(
  qualification: string,
  subjectSlug: string
): EdexcelSubject | null {
  return (
    getEdexcelSubjects().find(
      (s) => s.qualification === qualification && s.slug === subjectSlug
    ) ?? null
  )
}

export function getEdexcelQualification(slug: string) {
  return EDEXCEL_QUALIFICATIONS.find((q) => q.slug === slug) ?? null
}

export function getEdexcelUnitCodes(): string[] {
  return getEdexcelSubjects().flatMap((s) => s.units.map((u) => u.code))
}

/** Pearson IAL unit codes look like WMA11, WPH14, WST01. */
export function isEdexcelUnitCode(code: string): boolean {
  const trimmed = code.trim().toUpperCase()
  if (!/^W[A-Z]{2}\d{2}$/.test(trimmed)) return false
  return getEdexcelUnitCodes().includes(trimmed)
}

export function findEdexcelSubjectByUnitCode(code: string): EdexcelSubject | null {
  const upper = code.trim().toUpperCase()
  return getEdexcelSubjects().find((s) => s.units.some((u) => u.code === upper)) ?? null
}
