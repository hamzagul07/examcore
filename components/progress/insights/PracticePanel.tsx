
import type { Recommendation, DashboardState } from '@/lib/insights/types'
import { drillHref } from '@/lib/insights/drill-link'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { WaitingForInk } from '@/components/ui/WaitingForInk'

type Props = {
  state: DashboardState
  recommendations: Recommendation[]
  generic: boolean
}

export function PracticePanel({ state, recommendations, generic }: Props) {
  return (
    <section className="ms-dash-card min-w-0">
      <div className="mb-5 flex items-center gap-2">
        <span
          className="inline-grid h-5 min-w-5 place-items-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-1 font-mono text-[10px] font-bold tracking-wide text-[var(--ec-brand)]"
          aria-hidden
        >
          DR
        </span>
        <p className="ms-overline" style={{ marginBottom: 0 }}>
          Practice
        </p>
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
                  className="ec-card ec-card--paper border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))] p-4"
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
                    <span className="h-3.5 w-3.5" aria-hidden>-&gt;</span>
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
        </>
      )}
    </section>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return <WaitingForInk className="ec-break-anywhere ms-waiting-ink--inline">{children}</WaitingForInk>
}
