/**
 * Thin IAL session map (metadata only — no PDF bank).
 * Maths + science modular units share the Jan/June/Oct sitting pattern.
 */

import {
  getEdexcelMarkableSubjects,
  isEdexcelBiologyUnitCode,
  isEdexcelMathsUnitCode,
  isEdexcelScienceUnitCode,
} from '@/lib/edexcel/marking'

export type EdexcelPaperSeason = 'January' | 'June' | 'October'

export type EdexcelPaperSession = {
  year: number
  season: EdexcelPaperSeason
  /** Display label, e.g. "June 2024" */
  label: string
}

const SEASONS: EdexcelPaperSeason[] = ['January', 'June', 'October']

/** Recent IAL series students actually sit — newest first. */
const YEARS = [2025, 2024, 2023, 2022] as const

function buildSessions(): EdexcelPaperSession[] {
  const out: EdexcelPaperSession[] = []
  for (const year of YEARS) {
    for (const season of SEASONS) {
      out.push({ year, season, label: `${season} ${year}` })
    }
  }
  return out
}

const SHARED_SESSIONS = buildSessions()

function isIalModularUnit(code: string): boolean {
  return (
    isEdexcelMathsUnitCode(code) ||
    isEdexcelScienceUnitCode(code) ||
    isEdexcelBiologyUnitCode(code)
  )
}

/**
 * Session list for markable IAL modular units (Maths + Physics/Chem/Bio).
 * UK linear codes (9MA0/9PH0) → [].
 */
export function getEdexcelIalSessionsForUnit(unitCode: string): EdexcelPaperSession[] {
  const code = unitCode.trim().toUpperCase()
  if (!isIalModularUnit(code)) return []
  const markable = getEdexcelMarkableSubjects().some((s) =>
    s.units.some((u) => u.code === code)
  )
  if (!markable) return []
  return SHARED_SESSIONS
}

/** @deprecated Prefer getEdexcelIalSessionsForUnit — kept for Maths-named call sites. */
export function getEdexcelMathsSessionsForUnit(unitCode: string): EdexcelPaperSession[] {
  const code = unitCode.trim().toUpperCase()
  if (!isEdexcelMathsUnitCode(code)) return []
  return getEdexcelIalSessionsForUnit(code)
}

export function listEdexcelMathsUnitsWithSessions(): string[] {
  return (
    getEdexcelMarkableSubjects()
      .find((s) => s.slug === 'mathematics')
      ?.units.map((u) => u.code) ?? []
  )
}
