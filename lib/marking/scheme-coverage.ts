/**
 * Which past papers we can mark against the *official* scheme.
 *
 * Two different things have always been called "we have this paper":
 *
 *   1. the question-paper and mark-scheme PDFs are in storage, which is what
 *      /api/papers/available lists the picker from; and
 *   2. the mark scheme has been EXTRACTED into `mark_schemes` rows, which is
 *      what the marking pipeline needs to know the denominator.
 *
 * (1) covers far more subjects than (2) — extraction has only ever been run for
 * ten. So the picker offered subjects (4024, 5070, 2281, 9699, 9990) that the
 * pipeline could not mark officially, and the student found out only after the
 * wait, as "we could not read the total marks from your question". Half of all
 * marking failures over 60 days were that message.
 *
 * These helpers keep the two ideas apart and keep the key format in one place,
 * since the coverage set is built on the server and read on the client.
 */

/** `paper_session` as stored in `mark_schemes`, e.g. "May/June 2024". */
export function schemeSessionLabel(season: string, year: number): string {
  return `${season} ${year}`
}

/** Set key for one (paper, session) pair, e.g. "9709/12|May/June 2024". */
export function schemeCoverageKey(
  subjectCode: string,
  component: string,
  sessionLabel: string
): string {
  return `${subjectCode}/${component}|${sessionLabel}`
}

/**
 * Does this subject have NO structured scheme at all?
 *
 * The tri-state matters more than it looks. `hasSchemes` is absent from any
 * payload produced before coverage was reported — a cached response, an older
 * deploy — and absence means "no opinion", not "no scheme". Treating the two
 * alike would mark every subject as uncovered and demand a typed total from
 * every student on the site, including the ~70% whose subject we do hold.
 *
 * So: only an explicit `false` counts.
 */
export function subjectLacksBankedScheme(
  info: { hasSchemes?: boolean } | null | undefined
): boolean {
  return info?.hasSchemes === false
}
