import type { Win, WinKind, DashboardState } from '@/lib/insights/types'
import { WaitingForInk } from '@/components/ui/WaitingForInk'

const GLYPHS: Record<WinKind, string> = {
  first_mark: '1',
  personal_best: 'PB',
  // Board-neutral: A* is Cambridge-only; "100" reads for IB/AP too.
  perfect_score: '100',
  exam_ready: '✓',
  streak: 'S',
  coverage: '¶',
  grade_up: '↑',
}

export function WinsPanel({ state, wins }: { state: DashboardState; wins: Win[] }) {
  return (
    <section className="ms-dash-card min-w-0">
      <div className="mb-5 flex items-center gap-2">
        <span
          className="inline-grid h-5 min-w-5 place-items-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-1 font-mono text-[10px] font-bold text-[var(--ec-brand)]"
          aria-hidden
        >
          ★
        </span>
        <p className="ms-overline" style={{ marginBottom: 0 }}>
          Wins
        </p>
      </div>

      {wins.length === 0 ? (
        <WaitingForInk className="ec-break-anywhere">
          {state === 'zero'
            ? 'Wins will appear here once you start — your first marked question is the first one.'
            : 'Wins will appear here as you hit real milestones.'}
        </WaitingForInk>
      ) : (
        <ul className="space-y-2.5">
          {wins.map((win, i) => {
            const glyph = GLYPHS[win.kind]
            return (
              <li
                key={`${win.kind}-${i}`}
                className="ec-card ec-card--paper flex items-start gap-3 border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))] p-3.5"
              >
                <div
                  className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-1 font-mono text-[11px] font-bold tracking-wide text-[var(--ec-brand)]"
                  aria-hidden
                >
                  {glyph}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--ec-text-primary)]">
                    {win.title}
                  </p>
                  <p className="ec-break-anywhere mt-0.5 text-sm leading-snug text-[var(--ec-text-secondary)]">
                    {win.detail}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
