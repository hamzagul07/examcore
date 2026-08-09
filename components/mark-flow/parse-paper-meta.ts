/** Parse `9709/12` → subject + component for classic `/mark` host state. */
export function parsePaperCode(
  code: string
): { subject: string; component: string } | null {
  const trimmed = code.trim()
  const slash = trimmed.indexOf('/')
  if (slash <= 0 || slash === trimmed.length - 1) return null
  return {
    subject: trimmed.slice(0, slash),
    component: trimmed.slice(slash + 1),
  }
}

/** Parse `May/June 2024` → season + year (matches classic desk format). */
export function parsePaperSession(
  session: string
): { season: string; year: number } | null {
  const m = session.trim().match(/^(.*)\s+(\d{4})$/)
  if (!m) return null
  const season = m[1].trim()
  const year = Number(m[2])
  if (!season || !Number.isFinite(year)) return null
  return { season, year }
}
