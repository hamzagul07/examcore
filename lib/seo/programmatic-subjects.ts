import { SUBJECTS, type SubjectOption } from '@/lib/profile-options'
import { getSubjectPaperStructure } from '@/lib/subject-papers'
import { getSubjectGuideSlugForCode } from '@/lib/seo/subject-guides'
import { formatMetaDescription, formatSerpTitle } from '@/lib/seo/on-page'

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

function levelPhrase(levels: string[]): string {
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

  const title = formatSerpTitle(
    `Mark ${subject.label} (${subject.code}) past papers`,
    true
  )
  const description = formatMetaDescription(
    `Upload ${subject.label} ${level} answers (${subject.code}). Get ${subject.markingType === 'level_of_response' ? 'essay band' : 'B1/M1/A1'} feedback from real Cambridge mark schemes in seconds. Free to try.`
  )

  return {
    title,
    description,
    level,
    papers,
    guideSlug,
    path: `/subjects/${subject.code}`,
    quickAnswer: `MarkScheme marks Cambridge ${subject.label} syllabus ${subject.code} (${level}) from photos of your handwriting, using real mark-scheme wording — not a generic AI grade.`,
  }
}
