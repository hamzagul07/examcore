import 'server-only'

import Link from 'next/link'
import { ArrowRight, Calendar } from 'lucide-react'
import { getResultsDayBannerCopy, getResultsDayPhase } from '@/lib/seo/results-day'
import { hasJune2026Session, anyJune2026DataAvailable } from '@/lib/seo/grade-boundaries-data'

type ResultsDayBannerProps = {
  subjectCode?: string | null
  className?: string
}

/** Phase-aware strip for grade-boundary hub, calculator, and blog posts. */
export function ResultsDayBanner({ subjectCode = null, className = '' }: ResultsDayBannerProps) {
  const phase = getResultsDayPhase()
  const subjectLive = subjectCode ? hasJune2026Session(subjectCode) : false
  const anyLive = anyJune2026DataAvailable()
  const copy = getResultsDayBannerCopy({
    phase,
    subjectCode,
    hasJune2026Data: subjectLive || (!subjectCode && anyLive),
    calculatorHref: subjectCode
      ? `/tools/grade-boundary-calculator/${subjectCode}`
      : '/tools/grade-boundary-calculator',
  })

  return (
    <aside className={`ms-results-day-banner ${className}`.trim()} aria-label="June 2026 results and grade thresholds">
      <div className="ms-results-day-banner__icon" aria-hidden="true">
        <Calendar className="h-5 w-5" />
      </div>
      <div className="ms-results-day-banner__body">
        <p className="ms-overline" style={{ color: 'var(--ec-brand)', marginBottom: 6 }}>
          {copy.overline}
        </p>
        <h2 className="ms-h3" style={{ fontSize: '1.1rem', margin: 0 }}>
          {copy.title}
        </h2>
        <p className="ms-body-2" style={{ marginTop: 8, marginBottom: 0, maxWidth: 640 }}>
          {copy.body}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={copy.primaryHref} className="ec-btn-primary ec-btn-primary--sm">
            {copy.primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {copy.secondaryHref && copy.secondaryLabel ? (
            <Link href={copy.secondaryHref} className="ec-btn-ghost ec-btn-ghost--sm">
              {copy.secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
