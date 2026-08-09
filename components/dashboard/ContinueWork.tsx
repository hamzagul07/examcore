'use client'

import Link from 'next/link'
import type { Recommendation } from '@/lib/insights/types'
import { drillHref } from '@/lib/insights/drill-link'
import { LoadingLink } from '@/components/ui/LoadingLink'

type Props = {
  recommendations: Recommendation[]
  subjectLabel: string | null
}

export function ContinueWork({ recommendations, subjectLabel }: Props) {
  if (recommendations.length === 0) return null

  return (
    <section className="ms-continue-work mb-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              Q
            </span>
            <h2 className="text-title" style={{ margin: 0 }}>
              Next scripts on the desk
            </h2>
          </div>
          {subjectLabel && (
            <p className="text-caption mt-1">
              You were working on {subjectLabel} — pick up the ink where you left off
            </p>
          )}
        </div>
        <Link
          href="/dashboard/progress"
          className="inline-flex min-h-[44px] shrink-0 items-center font-mono text-xs font-bold uppercase tracking-wide text-[var(--ec-brand)]"
        >
          Deeper insights -&gt;
        </Link>
      </div>
      <ul className="ms-continue-work__list">
        {recommendations.slice(0, 3).map((rec) => (
          <li key={`${rec.paperCode}-${rec.questionNumber}`}>
            <LoadingLink
              href={drillHref(rec)}
              variant="card"
              className="ms-continue-work__slip"
            >
              <span className="ec-ink-stamp" aria-hidden>
                Q{rec.questionNumber}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--ec-text-primary)]">
                  {rec.targetLabel}
                </p>
                <p className="text-caption mt-1 line-clamp-2">{rec.reason}</p>
                <p className="mt-1 font-mono text-[11px] font-medium text-[var(--ec-text-secondary)]">
                  {rec.paperCode} · {rec.totalMarks}{' '}
                  {rec.totalMarks === 1 ? 'mark' : 'marks'}
                </p>
              </div>
              <span className="ms-continue-work__go" aria-hidden>
                Practise -&gt;
              </span>
            </LoadingLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
