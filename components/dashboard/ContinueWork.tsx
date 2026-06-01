import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Recommendation } from '@/lib/insights/types'
import { drillHref } from '@/lib/insights/drill-link'

type Props = {
  recommendations: Recommendation[]
  subjectLabel: string | null
}

export function ContinueWork({ recommendations, subjectLabel }: Props) {
  if (recommendations.length === 0) return null

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-title">Continue your work</h2>
          {subjectLabel && (
            <p className="text-caption mt-1">
              You were working on {subjectLabel} — pick up where you left off
            </p>
          )}
        </div>
        <Link
          href="/dashboard/progress"
          className="text-sm font-semibold text-[var(--ec-brand)]"
        >
          Deeper insights →
        </Link>
      </div>
      <ul className="space-y-3">
        {recommendations.slice(0, 3).map((rec) => (
          <li key={`${rec.paperCode}-${rec.questionNumber}`}>
            <Link
              href={drillHref(rec)}
              className="ec-card ec-card-interactive flex items-center justify-between gap-4 p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--ec-text-primary)]">
                  {rec.targetLabel}
                </p>
                <p className="text-caption mt-1 line-clamp-2">{rec.reason}</p>
              </div>
              <span className="ec-btn-secondary shrink-0 text-sm">
                Drill
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
