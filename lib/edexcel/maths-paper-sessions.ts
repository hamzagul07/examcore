/**
 * Thin IAL Maths session map (metadata only — no PDF bank yet).
 * Gives past-papers / unit landers a real exam calendar + mark CTAs
 * without waiting on scheme ingest.
 */

import {
  getEdexcelMarkableMathsSubject,
  isEdexcelMathsUnitCode,
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
      // 2025 Oct may not have sat yet depending on calendar; keep the map
      // complete so landers stay stable across the year.
      out.push({ year, season, label: `${season} ${year}` })
    }
  }
  return out
}

const SHARED_SESSIONS = buildSessions()

/**
 * Session list for IAL Maths units only. Physics/Chem → [] (no Maths calendar leak).
 * Same calendar for all Maths units (IAL modular sitting pattern).
 */
export function getEdexcelMathsSessionsForUnit(unitCode: string): EdexcelPaperSession[] {
  const code = unitCode.trim().toUpperCase()
  if (!isEdexcelMathsUnitCode(code)) return []
  const maths = getEdexcelMarkableMathsSubject()
  if (!maths?.units.some((u) => u.code === code)) return []
  return SHARED_SESSIONS
}

export function listEdexcelMathsUnitsWithSessions(): string[] {
  return getEdexcelMarkableMathsSubject()?.units.map((u) => u.code) ?? []
}
