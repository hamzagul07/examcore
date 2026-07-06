import 'server-only'

import Link from 'next/link'
import { ArrowRight, GraduationCap } from 'lucide-react'
import { getBlogPost } from '@/lib/blog'
import {
  getIbResultsSpotlightCopy,
  IB_MAY_2026_RESULTS_SLUG,
  isIbResultsSeason,
} from '@/lib/seo/ib-results-season'

type Props = {
  className?: string
}

/** Results-week strip for homepage, /ib, and /guides/ib. */
export function IbResultsSpotlight({ className = '' }: Props) {
  if (!isIbResultsSeason()) return null

  const post = getBlogPost(IB_MAY_2026_RESULTS_SLUG)
  if (!post) return null

  const copy = getIbResultsSpotlightCopy()

  return (
    <aside
      className={`ms-results-day-banner ${className}`.trim()}
      aria-label="IB May 2026 results"
    >
      <div className="ms-results-day-banner__icon" aria-hidden="true">
        <GraduationCap className="h-5 w-5" />
      </div>
      <div className="ms-results-day-banner__body">
        <p className="ms-overline" style={{ color: 'var(--ec-brand)', marginBottom: 6 }}>
          {copy.overline}
        </p>
        <h2 className="ms-h3" style={{ fontSize: '1.25rem', margin: 0 }}>
          <Link href={copy.primaryHref} className="hover:text-[var(--ec-brand)]">
            {post.title}
          </Link>
        </h2>
        <p className="ms-body-2" style={{ marginTop: 8, marginBottom: 0, maxWidth: 640 }}>
          {copy.body}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={copy.primaryHref} className="ec-btn-primary ec-btn-primary--sm">
            {copy.primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href={copy.secondaryHref} className="ec-btn-ghost ec-btn-ghost--sm">
            {copy.secondaryLabel}
          </Link>
          <Link href="/mark" className="ec-btn-ghost ec-btn-ghost--sm">
            Criterion marking
          </Link>
        </div>
      </div>
    </aside>
  )
}
