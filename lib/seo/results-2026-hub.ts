import {
  A_LEVEL_RESULTS_UTC,
  IGCSE_RESULTS_UTC,
  THRESHOLDS_PUBLISH_UTC,
  daysUntil,
  getResultsDayPhase,
  JUNE_2026_SERIES,
} from '@/lib/seo/results-day'
import { getGradeBoundaryCalculatorPages } from '@/lib/seo/programmatic-subjects'
import type { SubjectOption } from '@/lib/profile-options'
import { getSubjectsWithJune2026Data } from '@/lib/seo/grade-boundaries-data'

/** High-intent A-Level syllabuses featured on the Results Day hub. */
export const RESULTS_FEATURED_CODES = [
  '9709',
  '9702',
  '9701',
  '9700',
  '9708',
  '9609',
  '9618',
  '9990',
] as const

export type ResultsDeadline = {
  id: string
  label: string
  when: string
  utc: number
  detail: string
}

export function getResultsDeadlines(): ResultsDeadline[] {
  return [
    {
      id: 'a-level',
      label: 'AS & A Level results',
      when: '11 August 2026 · 05:00 GMT',
      utc: A_LEVEL_RESULTS_UTC,
      detail: 'Statement of results available via schools and Cambridge Direct.',
    },
    {
      id: 'thresholds',
      label: 'Grade threshold tables',
      when: 'Around 13 August 2026',
      utc: THRESHOLDS_PUBLISH_UTC,
      detail: 'Component boundaries publish after results — use them to interpret raw marks.',
    },
    {
      id: 'igcse',
      label: 'IGCSE & O Level results',
      when: '18 August 2026 · 05:00 GMT',
      utc: IGCSE_RESULTS_UTC,
      detail: 'Separate release for IGCSE / O Level syllabuses.',
    },
  ]
}

export function getResultsHubCopy(now = new Date()) {
  const phase = getResultsDayPhase(now)
  const days = daysUntil(A_LEVEL_RESULTS_UTC, now)
  if (phase === 'pre-alevel') {
    return {
      overline: `${JUNE_2026_SERIES} · ${days} day${days === 1 ? '' : 's'}`,
      title: 'Cambridge Results Day 2026',
      lead: 'AS & A Level results land 11 August 2026 (05:00 GMT). Check boundaries, interpret your statement, plan remarks or retakes, and capture a November mock pack — then practise the topics that decide the next grade.',
    }
  }
  if (phase === 'alevel-results') {
    return {
      overline: `${JUNE_2026_SERIES} · results are out`,
      title: 'Your Cambridge results are in',
      lead: 'Use the grade calculator with official thresholds (rolling out ~13 August), decide on remarks or retakes, and start a mock-season plan while the papers are still fresh.',
    }
  }
  if (phase === 'threshold-week') {
    return {
      overline: `${JUNE_2026_SERIES} · thresholds publishing`,
      title: 'Interpret your raw marks with official boundaries',
      lead: 'Grade threshold tables are rolling out. Load your syllabus, see the gap to the next grade, and practise weak topics before IGCSE results on 18 August.',
    }
  }
  return {
    overline: `${JUNE_2026_SERIES} · post-results`,
    title: 'After Results Day — remarks, retakes, mocks',
    lead: 'Boundaries are public. Plan remarks or November / June retakes, and use MarkScheme to mark past-paper questions on the topics that cost you marks.',
  }
}

export function getResultsSubjectLinks(): Array<SubjectOption & { href: string; hasJune2026: boolean }> {
  const june = new Set(getSubjectsWithJune2026Data())
  const pages = getGradeBoundaryCalculatorPages()
  const featured = new Set<string>(RESULTS_FEATURED_CODES)
  const ordered = [
    ...pages.filter((p) => featured.has(p.code)),
    ...pages.filter((p) => !featured.has(p.code)),
  ]
  return ordered.map((p) => ({
    ...p,
    href: `/results-2026/caie/${p.code}`,
    hasJune2026: june.has(p.code),
  }))
}
