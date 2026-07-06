/**
 * IB May 2026 results season — peak search demand early July.
 * May session results typically release the first week of July (often 6 July).
 */

export const IB_MAY_2026_RESULTS_SLUG = 'ib-results-day-2026-what-to-expect'

export const IB_POST_EXAM_PREP_SLUG = 'ib-post-exam-results-prep-2026'

/** Typical student portal release — confirm with your IB Coordinator. */
export const IB_MAY_2026_RESULTS_UTC = Date.parse('2026-07-06T12:00:00.000Z')

/** Active window for homepage / hub spotlight and featured hub pick. */
export const IB_RESULTS_SEASON_END_UTC = Date.parse('2026-07-31T23:59:59.000Z')

export type IbResultsSeasonPhase = 'pre-results' | 'results-week' | 'post-season'

export function getIbResultsSeasonPhase(now = new Date()): IbResultsSeasonPhase {
  const t = now.getTime()
  const seasonStart = Date.parse('2026-07-01T00:00:00.000Z')
  if (t < seasonStart) return 'pre-results'
  if (t <= IB_RESULTS_SEASON_END_UTC) return 'results-week'
  return 'post-season'
}

export function isIbResultsSeason(now = new Date()): boolean {
  return getIbResultsSeasonPhase(now) === 'results-week'
}

export function daysUntilIbResults(now = new Date()): number {
  const ms = IB_MAY_2026_RESULTS_UTC - now.getTime()
  if (ms <= 0) return 0
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}

export type IbResultsSpotlightCopy = {
  overline: string
  title: string
  body: string
  primaryHref: string
  primaryLabel: string
  secondaryHref: string
  secondaryLabel: string
}

export function getIbResultsSpotlightCopy(now = new Date()): IbResultsSpotlightCopy {
  const phase = getIbResultsSeasonPhase(now)
  const days = daysUntilIbResults(now)

  if (phase === 'pre-results') {
    return {
      overline: `May 2026 session — ${days} days`,
      title: 'IB results release in early July',
      body: 'Get your candidate PIN from your IB Coordinator, know the 24-point pass rules, and plan EUR or retakes before results land.',
      primaryHref: `/blog/${IB_MAY_2026_RESULTS_SLUG}`,
      primaryLabel: 'Results day guide',
      secondaryHref: `/blog/${IB_POST_EXAM_PREP_SLUG}`,
      secondaryLabel: 'Pre-results checklist',
    }
  }

  return {
    overline: 'May 2026 — results week',
    title: 'IB results are out — read your score and plan next steps',
    body: 'Log in at candidates.ibo.org, check your /45 total and subject grades, then use our guides for remarks, retakes, or university calls.',
    primaryHref: `/blog/${IB_MAY_2026_RESULTS_SLUG}`,
    primaryLabel: 'What to do now',
    secondaryHref: '/blog/ib-grade-boundaries-explained',
    secondaryLabel: 'May 2026 boundaries',
  }
}
