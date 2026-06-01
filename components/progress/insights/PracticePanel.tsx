import Link from 'next/link'
import { ArrowRight, Dumbbell, ChevronRight } from 'lucide-react'
import type { Recommendation, DashboardState } from '@/lib/insights/types'
import type { ActionPlanItem } from '@/lib/action-plan'
import { drillHref } from '@/lib/insights/drill-link'
import { LoadingLink } from '@/components/ui/LoadingLink'

type Props = {
  state: DashboardState
  recommendations: Recommendation[]
  actionItems: ActionPlanItem[]
  generic: boolean
}

export function PracticePanel({ state, recommendations, actionItems, generic }: Props) {
  return (
    <section className="ec-card min-w-0 p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-2">
        <Dumbbell className="h-4 w-4 text-[var(--ec-brand)]" aria-hidden="true" />
        <p className="ec-label-tech">PRACTICE</p>
      </div>

      {state === 'zero' ? (
        <Hint>We&rsquo;ll recommend questions once we see your work.</Hint>
      ) : (
        <>
          {generic && recommendations.length > 0 && (
            <p className="ec-break-anywhere mb-3 text-xs text-[var(--ec-text-secondary)]">
              Starter questions for your subject — these get personal once you&rsquo;ve marked a few more.
            </p>
          )}

          {recommendations.length > 0 ? (
            <ul className="space-y-3">
              {recommendations.map((rec) => (
                <li
                  key={`${rec.paperCode}-${rec.paperSession}-${rec.questionNumber}`}
                  className="rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-4"
                >
                  <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className="min-w-0 truncate text-sm font-semibold text-[var(--ec-text-primary)]">
                      {rec.targetLabel}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-[var(--ec-text-secondary)]">
                      {rec.paperCode} · Q{rec.questionNumber} · {rec.totalMarks}m
                    </span>
                  </div>
                  <p className="ec-break-anywhere mt-1.5 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
                    {rec.reason}
                  </p>
                  <LoadingLink
                    href={drillHref(rec)}
                    loadingText="Opening..."
                    className="ec-btn-secondary mt-3 inline-flex text-sm"
                  >
                    Drill this
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </LoadingLink>
                </li>
              ))}
            </ul>
          ) : (
            <Hint>
              Nothing flagged for targeted drilling right now — your weak spots are
              covered. Keep marking to widen your coverage.
            </Hint>
          )}

          {actionItems.length > 0 && (
            <div className="mt-4 space-y-2">
              {actionItems.slice(0, 2).map((item, i) => (
                <Link
                  key={`${item.type}-${i}`}
                  href={item.ctaHref}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--ec-border)] bg-[var(--ec-surface)] px-4 py-3 transition-colors hover:border-[var(--ec-brand)]/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ec-text-primary)]">
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-[var(--ec-text-secondary)]">
                      {item.body}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--ec-text-secondary)] transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="ec-break-anywhere rounded-2xl border border-dashed border-[var(--ec-border)] bg-[var(--ec-surface)] p-5 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
      {children}
    </div>
  )
}
