import Link from 'next/link'
import { FileText, NotebookPen, ChevronRight } from 'lucide-react'

export type RecentAttempt = {
  id: string
  marks_earned: number
  total_marks: number
  source_type: string
  question_text: string | null
  created_at: string
  label: string
  dateStr: string
  percentage: number
}

type Props = {
  attempts: RecentAttempt[]
}

export function RecentAttempts({ attempts }: Props) {
  if (attempts.length === 0) return null

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-title">Recent activity</h2>
        <Link
          href="/dashboard/progress?tab=attempts"
          className="shrink-0 text-sm font-semibold text-[var(--ec-brand)]"
        >
          View all
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {attempts.map((attempt) => {
          const scoreColor =
            attempt.percentage === 100
              ? 'text-emerald-400'
              : attempt.percentage >= 50
                ? 'text-amber-400'
                : 'text-red-400'

          return (
            <Link
              key={attempt.id}
              href={`/dashboard/attempt/${attempt.id}`}
              className="ec-card ec-card-interactive block p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      attempt.source_type === 'past_paper'
                        ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                        : 'border-violet-500/30 bg-violet-500/10 text-violet-400'
                    }`}
                  >
                    {attempt.source_type === 'past_paper' ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <NotebookPen className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ec-text-primary)]">
                      {attempt.label}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-[var(--ec-text-secondary)]">
                      {attempt.dateStr}
                    </p>
                  </div>
                </div>
                <div className={`shrink-0 text-lg font-bold ${scoreColor}`}>
                  {attempt.percentage}%
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end">
                <span className="text-xs font-medium text-[var(--ec-brand)]">
                  View <ChevronRight className="inline h-3 w-3" />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
