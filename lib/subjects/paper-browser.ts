import {
  sessionCodeToName,
  sessionCodeToYear,
} from '@/lib/marking/session'
import type { SubjectPaperStructure } from '@/lib/subject-papers'
import { getYearsFromSessions } from '@/lib/subject-papers'

export type PaperSessionGroup = {
  sessionCode: string
  name: string
  year: number
  variants: string[]
}

export function getPaperBrowserYears(
  structure: SubjectPaperStructure
): number[] {
  return getYearsFromSessions(structure.sessions)
}

export function buildPaperSessionGroups(
  structure: SubjectPaperStructure,
  yearFilter: number | 'all' = 'all'
): PaperSessionGroup[] {
  const variants = [
    ...new Set(structure.papers.flatMap((p) => p.components)),
  ].sort()

  return structure.sessions
    .filter((code) => {
      if (yearFilter === 'all') return true
      return sessionCodeToYear(code) === yearFilter
    })
    .sort((a, b) => {
      const ya = sessionCodeToYear(a) ?? 0
      const yb = sessionCodeToYear(b) ?? 0
      if (yb !== ya) return yb - ya
      return a.localeCompare(b)
    })
    .map((code) => ({
      sessionCode: code,
      name: sessionCodeToName(code) ?? code.toUpperCase(),
      year: sessionCodeToYear(code) ?? 0,
      variants,
    }))
}

export function hotTopicsForSubject(
  structure: SubjectPaperStructure | null
): string[] {
  if (structure?.papers.length) {
    return structure.papers.slice(0, 5).map((p) => p.name)
  }
  return [
    'Method marks (M1)',
    'Accuracy marks (A1)',
    'Quality of working',
    'Units and significant figures',
  ]
}
