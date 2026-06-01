import {
  Flag,
  Trophy,
  CircleCheck,
  Flame,
  Map,
  TrendingUp,
  Star,
  type LucideIcon,
} from 'lucide-react'
import type { Win, WinKind, DashboardState } from '@/lib/insights/types'

const ICONS: Record<WinKind, LucideIcon> = {
  first_mark: Flag,
  personal_best: Trophy,
  perfect_score: Star,
  exam_ready: CircleCheck,
  streak: Flame,
  coverage: Map,
  grade_up: TrendingUp,
}

export function WinsPanel({ state, wins }: { state: DashboardState; wins: Win[] }) {
  return (
    <section className="ec-card min-w-0 p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-[var(--ec-brand)]" aria-hidden="true" />
        <p className="ec-label-tech">WINS</p>
      </div>

      {wins.length === 0 ? (
        <div className="ec-break-anywhere rounded-2xl border border-dashed border-[var(--ec-border)] bg-[var(--ec-surface)] p-5 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
          {state === 'zero'
            ? 'Wins will appear here once you start — your first marked question is the first one.'
            : 'Wins will appear here as you hit real milestones.'}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {wins.map((win, i) => {
            const Icon = ICONS[win.kind]
            return (
              <li
                key={`${win.kind}-${i}`}
                className="flex items-start gap-3 rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-3.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--ec-brand)]/25 bg-[var(--ec-brand-muted)]">
                  <Icon className="h-4 w-4 text-[var(--ec-brand)]" aria-hidden="true" />
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
