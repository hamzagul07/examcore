import { SUBJECTS, type SubjectOption } from '@/lib/profile-options'
import { getSubjectPaperStructure } from '@/lib/subject-papers'
import { getSubjectGuideSlugForCode } from '@/lib/seo/subject-guides'
import { buildSubjectMarkingSeo } from '@/lib/seo/subject-seo'

/** Unique syllabus codes with live marking — programmatic SEO pages. */
export function getMarkingSubjectPages(): SubjectOption[] {
  const seen = new Set<string>()
  return SUBJECTS.filter((s) => {
    if (!s.markingEnabled || seen.has(s.code)) return false
    seen.add(s.code)
    return true
  })
}

export function getMarkingSubjectCodes(): string[] {
  return getMarkingSubjectPages().map((s) => s.code)
}

export function isValidMarkingSubjectCode(code: string): boolean {
  return getMarkingSubjectCodes().includes(code)
}

/**
 * Syllabuses with verified grade-threshold JSON and boundary guides but no live
 * marking yet — still need per-code calculator pages linked from blog posts.
 */
const GRADE_BOUNDARY_ONLY_SUBJECTS: SubjectOption[] = [
  {
    id: 'Mathematics',
    label: 'Mathematics',
    code: '0580',
    group: 'Mathematics',
    levels: ['IGCSE'],
    enabled: true,
    markingEnabled: false,
    markingType: 'point_based',
  },
  {
    id: 'First Language English',
    label: 'First Language English',
    code: '0990',
    group: 'Humanities & Social Sciences',
    levels: ['IGCSE'],
    enabled: true,
    markingEnabled: false,
    markingType: 'level_of_response',
  },
  {
    id: 'Biology',
    label: 'Biology',
    code: '0610',
    group: 'Sciences',
    levels: ['IGCSE'],
    enabled: true,
    markingEnabled: false,
    markingType: 'point_based',
  },
  {
    id: 'Chemistry',
    label: 'Chemistry',
    code: '0620',
    group: 'Sciences',
    levels: ['IGCSE'],
    enabled: true,
    markingEnabled: false,
    markingType: 'point_based',
  },
  {
    id: 'Physics',
    label: 'Physics',
    code: '0625',
    group: 'Sciences',
    levels: ['IGCSE'],
    enabled: true,
    markingEnabled: false,
    markingType: 'point_based',
  },
  {
    id: 'Geography',
    label: 'Geography',
    code: '0460',
    group: 'Humanities & Social Sciences',
    levels: ['IGCSE'],
    enabled: true,
    markingEnabled: false,
    markingType: 'level_of_response',
  },
  {
    id: 'Geography',
    label: 'Geography',
    code: '9696',
    group: 'Humanities & Social Sciences',
    levels: ['AS Level', 'A-Level'],
    enabled: true,
    markingEnabled: false,
    markingType: 'level_of_response',
  },
]

/** All syllabuses with a per-code grade boundary calculator page. */
export function getGradeBoundaryCalculatorPages(): SubjectOption[] {
  const seen = new Set<string>()
  return [...getMarkingSubjectPages(), ...GRADE_BOUNDARY_ONLY_SUBJECTS].filter((s) => {
    if (seen.has(s.code)) return false
    seen.add(s.code)
    return true
  })
}

export function getGradeBoundaryCalculatorCodes(): string[] {
  return getGradeBoundaryCalculatorPages().map((s) => s.code)
}

function levelPhrase(levels: string[]): string {
  if (levels.includes('IGCSE')) return 'IGCSE'
  if (levels.includes('O-Level') && !levels.includes('A-Level')) return 'O-Level'
  if (levels.includes('A-Level')) return 'A-Level'
  return levels[0] ?? 'Cambridge'
}

export function buildSubjectPageCopy(subject: SubjectOption) {
  const level = levelPhrase(subject.levels)
  const structure = getSubjectPaperStructure(subject.code)
  const papers = structure?.papers.length
    ? structure.papers.map((p) => `Paper ${p.paper}`).join(', ')
    : 'past papers in our library'
  const guideSlug = getSubjectGuideSlugForCode(subject.code)
  const seo = buildSubjectMarkingSeo(subject)

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    tagline: seo.tagline,
    topics: seo.topics,
    ogImagePath: seo.ogImagePath,
    level,
    papers,
    guideSlug,
    path: seo.path,
    quickAnswer: `MarkScheme marks Cambridge ${subject.label} syllabus ${subject.code} (${level}) from photos of your handwriting, using real mark-scheme wording — not a generic AI grade.`,
  }
}
