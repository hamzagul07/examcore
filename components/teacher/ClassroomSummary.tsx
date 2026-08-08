'use client'

import { Users, FileText, TrendingUp } from 'lucide-react'

interface Props {
  studentCount: number
  totalAttempts: number
  avgScore: number
}

export function ClassroomSummary({ studentCount, totalAttempts, avgScore }: Props) {
  // A class with no marked work has no average — it has an unknown one. Rendering
  // `avgScore.toFixed(0)}%` regardless meant every teacher's first screen told
  // them their class averages 0%, which is a false statement dressed as a
  // measurement. Counts are still true at zero; only the average is undefined.
  //
  // Gated on attempts rather than on the score, because a class that genuinely
  // scored 0% should see 0%.
  const hasMarkedWork = totalAttempts > 0

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="ec-card p-5">
        <div className="mb-2 flex items-center gap-2 text-[var(--ec-text-secondary)]">
          <Users className="h-4 w-4 ec-text-brand" aria-hidden />
          <span className="ec-label-tech">STUDENTS</span>
        </div>
        <div className="text-3xl font-bold text-[var(--ec-text-primary)]">{studentCount}</div>
      </div>

      <div className="ec-card p-5">
        <div className="mb-2 flex items-center gap-2 text-[var(--ec-text-secondary)]">
          <FileText className="h-4 w-4 text-[var(--ec-chip-accent-text)]" aria-hidden />
          <span className="ec-label-tech">ATTEMPTS</span>
        </div>
        <div className="text-3xl font-bold text-[var(--ec-text-primary)]">{totalAttempts}</div>
      </div>

      <div className="ec-card p-5">
        <div className="mb-2 flex items-center gap-2 text-[var(--ec-text-secondary)]">
          <TrendingUp className="h-4 w-4 text-[var(--ec-chip-info-text)]" aria-hidden />
          <span className="ec-label-tech">CLASS AVERAGE</span>
        </div>
        {hasMarkedWork ? (
          <div className="text-3xl font-bold text-[var(--ec-text-primary)]">
            {avgScore.toFixed(0)}%
          </div>
        ) : (
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-bold text-[var(--ec-text-faint)]"
              aria-label="No class average yet"
            >
              —
            </span>
            <span className="text-sm text-[var(--ec-text-secondary)]">no marks yet</span>
          </div>
        )}
      </div>
    </div>
  )
}
