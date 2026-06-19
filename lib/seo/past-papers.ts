import {
  getAllCachedSubjectCodes,
  getSubjectPaperStructure,
  getYearsFromSessions,
  type SubjectPaperStructure,
} from '@/lib/subject-papers'
import { getSubjectByCode } from '@/lib/profile-options'
import { getCatalogSubject } from '@/lib/subjects-catalog'
import { getCourseSubject } from '@/lib/courses'
import { isValidMarkingSubjectCode } from '@/lib/seo/programmatic-subjects'
import { subjectGlyph } from '@/lib/courses/margin-notes/subject-meta'

export type PastPaperSubject = {
  code: string
  label: string
  level: string
  glyph: string
  years: number[]
  yearRange: string
  paperCount: number
  componentCount: number
  hasMarking: boolean
  hasCourse: boolean
  structure: SubjectPaperStructure
}

function levelOf(code: string): string {
  const subject = getSubjectByCode(code)
  const levels = subject?.levels ?? []
  if (levels.includes('A-Level')) return 'A-Level'
  if (levels.includes('AS Level')) return 'AS & A-Level'
  if (levels.includes('O-Level')) return 'O-Level'
  if (levels.includes('IGCSE')) return 'IGCSE'
  return getCatalogSubject(code)?.levels?.[0] ?? 'Cambridge'
}

function labelOf(code: string): string | null {
  return (
    getSubjectByCode(code)?.label ??
    getCatalogSubject(code)?.name ??
    getCourseSubject(code)?.name ??
    null
  )
}

function yearRange(years: number[]): string {
  if (!years.length) return ''
  const min = Math.min(...years)
  const max = Math.max(...years)
  return min === max ? `${min}` : `${min}–${max}`
}

/** Every syllabus with past-paper PDFs in storage, enriched for SEO pages. */
export function getPastPaperSubjects(): PastPaperSubject[] {
  const out: PastPaperSubject[] = []
  for (const code of getAllCachedSubjectCodes()) {
    const structure = getSubjectPaperStructure(code)
    if (!structure || !structure.sessions.length || !structure.papers.length) continue
    const label = labelOf(code)
    if (!label) continue

    const years = getYearsFromSessions(structure.sessions)
    const componentCount = new Set(structure.papers.flatMap((p) => p.components)).size
    out.push({
      code,
      label,
      level: levelOf(code),
      glyph: subjectGlyph(code, label),
      years,
      yearRange: yearRange(years),
      paperCount: structure.papers.length,
      componentCount,
      hasMarking: isValidMarkingSubjectCode(code),
      hasCourse: Boolean(getCourseSubject(code)),
      structure,
    })
  }
  return out.sort((a, b) => a.label.localeCompare(b.label))
}

export function getPastPaperSubject(code: string): PastPaperSubject | null {
  return getPastPaperSubjects().find((s) => s.code === code) ?? null
}

export function getPastPaperSubjectCodes(): string[] {
  return getPastPaperSubjects().map((s) => s.code)
}

export function buildPastPaperSubjectCopy(subject: PastPaperSubject) {
  const { label, code, level, yearRange: range, componentCount, years } = subject
  const sessionCount = subject.structure.sessions.length
  const title = `${label} (${code}) Past Papers & Mark Schemes${range ? ` ${range}` : ''}`
  const description = `Practise every Cambridge ${level} ${label} (${code}) past paper${
    range ? ` from ${range}` : ''
  } and get instant mark-scheme marking. ${componentCount} components across ${sessionCount} exam series — upload your answers and score against the real ${code} mark scheme.`
  return {
    title,
    description,
    path: `/past-papers/${code}`,
    keywords: [
      `${code} past papers`,
      `${label} ${code} past papers`,
      `${code} mark scheme`,
      `Cambridge ${label} past papers`,
      `${code} ${level} past papers`,
      `${label} exam questions`,
      ...(years[0] ? [`${code} ${years[0]} past paper`] : []),
    ],
    ogImagePath: subject.hasMarking
      ? `/subjects/${code}/opengraph-image`
      : `/past-papers/opengraph-image`,
  }
}
