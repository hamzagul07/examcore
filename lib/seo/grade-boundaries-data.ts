import fs from 'fs'
import path from 'path'
import type { OfficialBoundaries } from '@/lib/seo/grade-boundaries'
import { isJune2026Session, JUNE_2026_SERIES } from '@/lib/seo/results-day'

export { JUNE_2026_SERIES }

/**
 * Server-only loader for verified official grade-threshold data. Kept separate
 * from grade-boundaries.ts (which the client calculator imports) so fs never
 * reaches the client bundle. Data is hand-verified against the official Cambridge
 * grade threshold PDFs — see each file's sourceUrl.
 */
const DATA_DIR = path.join(process.cwd(), 'content', 'data', 'grade-boundaries')

export function getOfficialBoundaries(code: string): OfficialBoundaries | null {
  const file = path.join(DATA_DIR, `${code}.json`)
  if (!fs.existsSync(file)) return null
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as OfficialBoundaries
  } catch {
    return null
  }
}

export function getSubjectsWithOfficialData(): string[] {
  if (!fs.existsSync(DATA_DIR)) return []
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
}

export function hasJune2026Session(code: string): boolean {
  const data = getOfficialBoundaries(code)
  return data?.sessions.some((s) => isJune2026Session(s.session)) ?? false
}

export function getSubjectsWithJune2026Data(): string[] {
  return getSubjectsWithOfficialData().filter((code) => hasJune2026Session(code))
}

export function anyJune2026DataAvailable(): boolean {
  return getSubjectsWithJune2026Data().length > 0
}
