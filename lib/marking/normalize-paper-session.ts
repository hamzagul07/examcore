/**
 * Normalize Cambridge paper_session for /mark pickers + DB lookup.
 * Accepts short codes (`w24`) or full labels (`October/November 2024`).
 */
import {
  sessionCodeToName,
  sessionCodeToYear,
  seasonNameFromSessionCode,
} from '@/lib/marking/session'

export function normalizePaperSession(raw: string): {
  label: string
  season: string | null
  year: number | null
} {
  const trimmed = (raw || '').trim()
  if (!trimmed) return { label: '', season: null, year: null }

  const fromCode = sessionCodeToName(trimmed)
  if (fromCode) {
    return {
      label: fromCode,
      season: seasonNameFromSessionCode(trimmed),
      year: sessionCodeToYear(trimmed),
    }
  }

  const match = trimmed.match(/^(.*)\s+(\d{4})$/)
  if (match) {
    return {
      label: trimmed,
      season: match[1].trim(),
      year: Number(match[2]),
    }
  }

  return { label: trimmed, season: trimmed, year: null }
}
