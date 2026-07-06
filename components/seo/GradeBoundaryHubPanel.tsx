import 'server-only'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getGradeBoundaryHubEntries } from '@/lib/seo/grade-boundary-hub'
import { hasJune2026Session } from '@/lib/seo/grade-boundaries-data'
import { JUNE_2026_SERIES } from '@/lib/seo/results-day'
import { hasSyllabusTree } from '@/lib/syllabi'
import { ResultsDayBanner } from '@/components/seo/ResultsDayBanner'

const FEATURED_CODES = ['9709', '0580', '0610', '0620', '0625', '5090', '5070', '5054', '9695', '0990', '2281', '7115', '4037', '2210', '9702', '9700', '9701', '9708', '9609', '9990', '9489', '9696', '9706', '0460', '4024'] as const

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

      <div className="mt-10">
        <p className="ms-overline">By syllabus</p>
        <h2 className="ms-h3" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.6rem)' }}>
          Grade boundaries & calculators
        </h2>
        <p className="ms-body-2" style={{ marginTop: 10, maxWidth: 680 }}>
          {juneLiveCount > 0
            ? `${juneLiveCount} subject${juneLiveCount === 1 ? '' : 's'} with verified ${JUNE_2026_SERIES} thresholds in the calculator. Others use historical sessions until we ingest the official PDF.`
            : `Official ${JUNE_2026_SERIES} tables load in the calculator as Cambridge publishes them. Until then, use the most recent session in each subject guide.`}
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
          <Link href="/blog/cambridge-results-day-august-2026-guide" className="ec-btn-ghost ec-btn-ghost--sm">
            Results day guide
          </Link>
          <Link href="/blog/how-to-read-cambridge-grade-boundaries" className="ec-btn-ghost ec-btn-ghost--sm">
            How boundaries work
          </Link>
          <Link href="/tools/grade-boundary-calculator" className="ec-btn-primary ec-btn-primary--sm">
            Open calculator <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
