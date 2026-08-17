import 'server-only'

import Link from 'next/link'

import { getGradeBoundaryHubEntries } from '@/lib/seo/grade-boundary-hub'
import { hasJune2026Session } from '@/lib/seo/grade-boundaries-data'
import { JUNE_2026_SERIES } from '@/lib/seo/results-day'
import { hasSyllabusTree } from '@/lib/syllabi'
import { ResultsDayBanner } from '@/components/seo/ResultsDayBanner'

const FEATURED_CODES = ['9709', '9231', '0580', '0610', '0620', '0625', '5090', '5070', '5054', '9695', '0990', '2281', '7115', '7707', '4037', '2210', '9702', '9700', '9701', '9708', '9609', '9990', '9489', '9696', '9706', '0460', '4024'] as const

function sortEntries(entries: ReturnType<typeof getGradeBoundaryHubEntries>) {
  const featured = new Set<string>(FEATURED_CODES)
  return [...entries].sort((a, b) => {
    const aFeat = featured.has(a.code) ? 0 : 1
    const bFeat = featured.has(b.code) ? 0 : 1
    if (aFeat !== bFeat) return aFeat - bFeat
    if (a.hasOfficialData !== b.hasOfficialData) return a.hasOfficialData ? -1 : 1
    return a.label.localeCompare(b.label)
  })
}

/** Hub panel: results-day strip + subject index with official-data status. */
export function GradeBoundaryHubPanel() {
  const entries = sortEntries(
    getGradeBoundaryHubEntries().filter((e) => e.guideSlug || e.hasOfficialData)
  )
  const juneLiveCount = entries.filter((e) => hasJune2026Session(e.code)).length

  return (
    <div className="mb-12">
      <ResultsDayBanner />

      <div className="mt-8 overflow-x-auto">
        <table className="gb-data-table ms-boundary-hub-table">
          <caption className="sr-only">June 2026 grade boundaries quick answers</caption>
          <thead>
            <tr>
              <th>Question</th>
              <th>Answer</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>When are June 2026 grades?</td>
              <td>AS &amp; A Level <strong>11 Aug</strong>; IGCSE/O Level <strong>18 Aug</strong> (05:00 GMT)</td>
            </tr>
            <tr>
              <td>When are threshold tables / expected boundaries?</td>
              <td>
                Official component PDFs typically <strong>~13 Aug</strong> — not before. Estimate with recent
                sessions until then.
              </td>
            </tr>
            <tr>
              <td>Where do I check my mark vs a boundary?</td>
              <td>
                <Link href="/tools/will-my-grade-hold" className="ec-btn-underline">
                  Will my grade hold?
                </Link>
                {' · '}
                <Link href="/tools/grade-boundary-calculator" className="ec-btn-underline">
                  Calculator
                </Link>
                {' · '}
                <Link href="/results-2026" className="ec-btn-underline">
                  Results Day hub
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-10">
        <p className="ms-overline">By syllabus</p>
        <h2 className="ms-h3" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.6rem)' }}>
          Grade boundaries 2026 by subject
        </h2>
        <p className="ms-body-2" style={{ marginTop: 10, maxWidth: 680 }}>
          {juneLiveCount > 0
            ? `${juneLiveCount} subject${juneLiveCount === 1 ? '' : 's'} with verified ${JUNE_2026_SERIES} thresholds in the calculator. Others use historical sessions until we ingest the official PDF.`
            : `Looking for May/June 2026 grade boundaries or expected thresholds? Official ${JUNE_2026_SERIES} tables load in the calculator as Cambridge publishes them. Until then, use the most recent session in each subject guide — or stress-test your raw mark on Will my grade hold?.`}
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="gb-data-table ms-boundary-hub-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Subject</th>
                <th>Data</th>
                <th>Guide</th>
                <th>Course</th>
                <th>Hold</th>
                <th>Calculator</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const juneLive = hasJune2026Session(entry.code)
                return (
                  <tr key={entry.code}>
                    <td className="mono">{entry.code}</td>
                    <td>
                      {entry.label}
                      <span className="ms-boundary-hub-level">{entry.level}</span>
                    </td>
                    <td>
                      {juneLive ? (
                        <span className="ec-chip ec-chip-accent">{JUNE_2026_SERIES}</span>
                      ) : entry.hasOfficialData ? (
                        <span className="ec-chip">Historical</span>
                      ) : (
                        <span className="ms-boundary-hub-muted">Estimate</span>
                      )}
                    </td>
                    <td>
                      {entry.guideSlug ? (
                        <Link href={`/blog/${entry.guideSlug}`} className="ec-btn-underline">
                          2026 guide
                        </Link>
                      ) : (
                        <span className="ms-boundary-hub-muted">—</span>
                      )}
                    </td>
                    <td>
                      {hasSyllabusTree(entry.code) ? (
                        <Link href={`/courses/${entry.code}`} className="ec-btn-underline">
                          Free course
                        </Link>
                      ) : (
                        <span className="ms-boundary-hub-muted">—</span>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/tools/will-my-grade-hold?code=${encodeURIComponent(entry.code)}`}
                        className="ec-btn-underline"
                      >
                        Hold
                      </Link>
                    </td>
                    <td>
                      <Link href={entry.calculatorPath} className="ec-btn-underline">
                        Calculator
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/tools/will-my-grade-hold" className="ec-btn-primary ec-btn-primary--sm">
            Will my grade hold? <span className="h-4 w-4" aria-hidden>-&gt;</span>
          </Link>
          <Link href="/tools/grade-boundary-calculator" className="ec-btn-ghost ec-btn-ghost--sm">
            Open calculator
          </Link>
          <Link href="/blog/cambridge-results-day-august-2026-guide" className="ec-btn-ghost ec-btn-ghost--sm">
            Results day guide
          </Link>
          <Link href="/blog/how-to-read-cambridge-grade-boundaries" className="ec-btn-ghost ec-btn-ghost--sm">
            How boundaries work
          </Link>
          <Link href="/insights" className="ec-btn-ghost ec-btn-ghost--sm">
            Self-marking gap data
          </Link>
        </div>

        <aside className="mt-8 flex flex-wrap items-center justify-between gap-4 ec-card ec-card--paper border border-[var(--ec-border)] px-5 py-4">
          <p className="ms-body-2" style={{ margin: 0, maxWidth: 520 }}>
            Sitting Edexcel International A Level? Boundaries use UMS / cash-in,
            not Cambridge raw thresholds — then mark Wave 1 Maths units on the
            same product.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/edexcel/international-a-level/mathematics/grade-boundaries"
              className="ec-btn-secondary ec-btn-secondary--sm"
            >
              Edexcel UMS explainer
            </Link>
            <Link href="/mark?board=edexcel&subject=WMA11" className="ec-btn-primary ec-btn-primary--sm">
              Mark WMA11 <span className="h-4 w-4" aria-hidden>-&gt;</span>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
