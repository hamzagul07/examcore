/**
 * The two strings that name a Cambridge paper on /mark, parsed one way.
 *
 * `9709/12` and `May/June 2024` are typed, deep-linked and picked from the
 * catalog in three places (the classic desk, the v2 MarkFlow host and its
 * past-paper picker), and each grew its own copy of the split. The v2 picker's
 * regex and the host's drifted apart once already; this is the single copy.
 *
 * Pure. `normalizePaperSession` handles the short-code form (`w24`) for deep
 * links — this is only the long label the pickers and the server exchange.
 */

/** `9709/12` → subject + component. Null when either side is missing. */
export function parsePaperCode(
  code: string | null | undefined
): { subject: string; component: string } | null {
  const trimmed = (code ?? '').trim()
  const slash = trimmed.indexOf('/')
  if (slash <= 0 || slash === trimmed.length - 1) return null
  return {
    subject: trimmed.slice(0, slash),
    component: trimmed.slice(slash + 1),
  }
}

/** `May/June 2024` → season + year. Null when the trailing year is missing. */
export function parsePaperSession(
  session: string | null | undefined
): { season: string; year: number } | null {
  const m = (session ?? '').trim().match(/^(.*\S)\s+(\d{4})$/)
  if (!m) return null
  const season = m[1].trim()
  const year = Number(m[2])
  if (!season || !Number.isFinite(year)) return null
  return { season, year }
}

/** The inverse, so a season/year pair round-trips to the label the server keys on. */
export function formatPaperSession(season: string, year: number | ''): string {
  return season && year !== '' ? `${season} ${year}` : ''
}

export function formatPaperCode(subject: string, component: string): string {
  return subject && component ? `${subject}/${component}` : ''
}
