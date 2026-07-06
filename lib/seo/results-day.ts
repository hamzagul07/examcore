/**
 * Cambridge June 2026 results-day calendar and copy helpers.
 * Grades and grade-threshold tables publish on different days — keep both in sync
 * with the official key dates page each series.
 */

export const JUNE_2026_SERIES = 'June 2026' as const

/** Featured hub slug during A-Level results + threshold week (August). */
export const CAMBRIDGE_RESULTS_DAY_SLUG = 'cambridge-results-day-august-2026-guide'

/** AS & A Level results — Tuesday 11 August 2026, 06:00 GMT */
export const A_LEVEL_RESULTS_UTC = Date.parse('2026-08-11T06:00:00.000Z')

/** Grade threshold tables for the June series — typically ~13 August */
export const THRESHOLDS_PUBLISH_UTC = Date.parse('2026-08-13T06:00:00.000Z')

/** IGCSE & O Level results — Tuesday 18 August 2026, 06:00 GMT */
export const IGCSE_RESULTS_UTC = Date.parse('2026-08-18T06:00:00.000Z')

export type ResultsDayPhase =
  | 'pre-alevel'
  | 'alevel-results'
  | 'threshold-week'
  | 'post-igcse'

export function getResultsDayPhase(now = new Date()): ResultsDayPhase {
  const t = now.getTime()
  if (t < A_LEVEL_RESULTS_UTC) return 'pre-alevel'
  if (t < THRESHOLDS_PUBLISH_UTC) return 'alevel-results'
  if (t < IGCSE_RESULTS_UTC) return 'threshold-week'
  return 'post-igcse'
}

export function daysUntil(targetUtc: number, now = new Date()): number {
  const ms = targetUtc - now.getTime()
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}

export function isJune2026Session(session: string): boolean {
  return session.trim().toLowerCase() === JUNE_2026_SERIES.toLowerCase()
}

export type ResultsDayBannerCopy = {
  overline: string
  title: string
  body: string
  primaryHref: string
  primaryLabel: string
  secondaryHref?: string
  secondaryLabel?: string
}

type BannerContext = {
  phase: ResultsDayPhase
  subjectCode?: string | null
  hasJune2026Data?: boolean
  calculatorHref?: string
}

export function getResultsDayBannerCopy(ctx: BannerContext): ResultsDayBannerCopy {
  const code = ctx.subjectCode
  const calc = ctx.calculatorHref ?? (code ? `/tools/grade-boundary-calculator/${code}` : '/tools/grade-boundary-calculator')

  if (ctx.hasJune2026Data && code) {
    return {
      overline: `${JUNE_2026_SERIES} · live`,
      title: `Official ${code} grade thresholds are in the calculator`,
      body: `We have verified the Cambridge ${JUNE_2026_SERIES} threshold table for ${code}. Load your component in the calculator, or compare against your statement of results.`,
      primaryHref: calc,
      primaryLabel: `Open ${code} calculator`,
      secondaryHref: '/guides/grade-boundaries',
      secondaryLabel: 'All subjects',
    }
  }

  if (ctx.hasJune2026Data) {
    return {
      overline: `${JUNE_2026_SERIES} · live`,
      title: 'June 2026 grade thresholds are rolling out',
      body: 'Official Cambridge threshold tables are being added subject by subject. Pick your syllabus in the calculator — we load verified component boundaries where available.',
      primaryHref: '/tools/grade-boundary-calculator',
      primaryLabel: 'Grade calculator',
      secondaryHref: '/guides/grade-boundaries',
      secondaryLabel: 'Subject index',
    }
  }

  switch (ctx.phase) {
    case 'pre-alevel':
      return {
        overline: `June 2026 series · ${daysUntil(A_LEVEL_RESULTS_UTC)} days`,
        title: 'Finished exams? Prep for results day now',
        body: code
          ? `AS & A Level results land 11 August 2026; grade threshold tables for ${code} follow around 13 August. Build your evidence file and honest grade estimate before then.`
          : 'AS & A Level results land 11 August 2026 (06:00 GMT). Use the gap after exams to predict grades honestly, save marked scripts, and plan remarks — not leak rumours.',
        primaryHref: '/blog/cambridge-post-exam-results-prep-2026',
        primaryLabel: 'Post-exam results prep',
        secondaryHref: '/blog/cambridge-results-day-august-2026-guide',
        secondaryLabel: 'Results day guide',
      }
    case 'alevel-results':
      return {
        overline: 'A-Level results · June 2026',
        title: 'Grades are out — threshold tables publish soon',
        body: code
          ? `Your ${code} grade is on your statement. Component grade thresholds publish around 13 August — we will load the official ${JUNE_2026_SERIES} table in the calculator as soon as Cambridge releases it.`
          : 'Cambridge has released AS & A Level grades. Per-component grade threshold tables for June 2026 publish around 13 August — check back here or use recent sessions to interpret raw marks.',
        primaryHref: '/blog/cambridge-results-day-august-2026-guide',
        primaryLabel: 'What to do next',
        secondaryHref: calc,
        secondaryLabel: code ? `Estimate ${code}` : 'Grade calculator',
      }
    case 'threshold-week':
      return {
        overline: `${JUNE_2026_SERIES} thresholds`,
        title: 'Grade threshold tables are publishing now',
        body: code
          ? `Cambridge is releasing ${JUNE_2026_SERIES} grade thresholds for ${code}. We add verified tables to the calculator as they go live — refresh or pick another subject if yours is not loaded yet.`
          : 'Cambridge is publishing June 2026 grade threshold tables subject by subject. Pick your syllabus below — official component marks load automatically where we have verified the PDF.',
        primaryHref: calc,
        primaryLabel: code ? `Check ${code} calculator` : 'Open grade calculator',
        secondaryHref: '/guides/grade-boundaries',
        secondaryLabel: 'Subject index',
      }
    case 'post-igcse':
    default:
      return {
        overline: `${JUNE_2026_SERIES} · complete`,
        title: 'June 2026 threshold season',
        body: code
          ? `IGCSE and O Level results released 18 August. ${code} thresholds should be on the Cambridge site — we mirror verified tables in the calculator when available.`
          : 'IGCSE and O Level results released 18 August 2026. All June threshold tables should be on the Cambridge site; we mirror verified data in the calculator as we ingest each syllabus.',
        primaryHref: '/guides/grade-boundaries',
        primaryLabel: 'Browse subjects',
        secondaryHref: calc,
        secondaryLabel: code ? `${code} calculator` : 'Grade calculator',
      }
  }
}
