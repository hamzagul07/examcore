import { Gauge, ScanSearch } from 'lucide-react'
import type { Pattern, DashboardState } from '@/lib/insights/types'
import type { SpeedProfile } from '@/lib/insights/patterns'

type Props = {
  state: DashboardState
  patterns: Pattern[]
  speedProfile: SpeedProfile
}

export function PatternsPanel({ state, patterns, speedProfile }: Props) {
  return (
    <section className="ec-card min-w-0 p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-2">
        <ScanSearch className="h-4 w-4 text-[var(--ec-brand)]" aria-hidden="true" />
        <p className="ec-label-tech">PATTERNS</p>
      </div>

      {state !== 'active' ? (
        <Hint>
          {state === 'zero'
            ? 'Insights appear after 5+ marks.'
            : 'Insights appear after 5+ marks — keep going and your recurring mistakes will surface here.'}
        </Hint>
      ) : patterns.length === 0 ? (
        <Hint>
          No recurring error pattern in your recent work — your mistakes look like
          one-offs rather than a habit. That&rsquo;s a good place to be.
        </Hint>
      ) : (
        <ul className="space-y-3">
          {patterns.map((p) => (
            <li
              key={p.classification}
              className="rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-4"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: p.color, boxShadow: `0 0 8px ${p.color}99` }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 truncate text-sm font-semibold text-[var(--ec-text-primary)]">
                    {p.label}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-xs text-[var(--ec-text-secondary)]">
                  {p.attemptsAffected}/{p.attemptsAnalysed} questions
                </span>
              </div>
              <p className="ec-break-anywhere mt-2 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
                {p.insight}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface)] p-4">
        <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="ec-break-anywhere text-sm font-semibold text-[var(--ec-text-primary)]">
            {speedProfile.label}
            {speedProfile.timedCount > 0 && (
              <span className="ml-2 font-mono text-xs font-normal text-[var(--ec-text-secondary)]">
                {speedProfile.timedCount} timed
              </span>
            )}
          </p>
          <p className="ec-break-anywhere mt-1 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            {speedProfile.detail}
          </p>
        </div>
      </div>
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
