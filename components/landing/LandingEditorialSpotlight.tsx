import 'server-only'

import Link from 'next/link'
import { ArrowRight, Calendar } from 'lucide-react'
import { IbResultsSpotlight } from '@/components/seo/IbResultsSpotlight'
import { getFeaturedHubPost } from '@/lib/content/hub-display'
import { isIbResultsSeason } from '@/lib/seo/ib-results-season'
import {
  A_LEVEL_RESULTS_UTC,
  daysUntil,
  getResultsDayPhase,
} from '@/lib/seo/results-day'

/** Homepage strip — IB results week first, then Cambridge pre-results spotlight. */
export function LandingEditorialSpotlight() {
  if (isIbResultsSeason()) {
    return (
      <section className="ms-pg ms-landing-spotlight" aria-label="Featured guide">
        <IbResultsSpotlight />
      </section>
    )
  }

  if (getResultsDayPhase() !== 'pre-alevel') return null

  const post = getFeaturedHubPost()
  if (!post) return null

  const days = daysUntil(A_LEVEL_RESULTS_UTC)

  return (
    <section className="ms-pg ms-landing-spotlight" aria-label="Featured guide">
      <aside className="ms-results-day-banner">
        <div className="ms-results-day-banner__icon" aria-hidden="true">
          <Calendar className="h-5 w-5" />
        </div>
        <div className="ms-results-day-banner__body">
          <p className="ms-overline" style={{ color: 'var(--ec-brand)', marginBottom: 6 }}>
            June 2026 — {days} days to results
          </p>
          <h2 className="ms-h3" style={{ fontSize: '1.25rem', margin: 0 }}>
            <Link href={`/blog/${post.slug}`} className="hover:text-[var(--ec-brand)]">
              {post.title}
            </Link>
          </h2>
          {post.description ? (
            <p className="ms-body-2" style={{ marginTop: 8, marginBottom: 0, maxWidth: 640 }}>
              {post.description}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/blog/${post.slug}`} className="ec-btn-primary ec-btn-primary--sm">
              Read the checklist
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/tools/grade-boundary-calculator"
              className="ec-btn-ghost ec-btn-ghost--sm"
            >
              Grade calculator
            </Link>
          </div>
        </div>
      </aside>
    </section>
  )
}
