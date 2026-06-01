'use client'

import { Users, FileText, TrendingUp } from 'lucide-react'

interface Props {
  studentCount: number
  totalAttempts: number
  avgScore: number
}

export function ClassroomSummary({ studentCount, totalAttempts, avgScore }: Props) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="ec-card p-5">
        <div className="mb-2 flex items-center gap-2 text-[var(--ec-text-secondary)]">
          <Users className="h-4 w-4 ec-text-brand" />
          <span className="ec-label-tech">STUDENTS</span>
        </div>
        <div className="text-3xl font-bold text-[var(--ec-text-primary)]">{studentCount}</div>
      </div>
      <div className="ec-card p-5">
        <div className="mb-2 flex items-center gap-2 text-[var(--ec-text-secondary)]">
          <FileText className="h-4 w-4 text-[var(--ec-chip-accent-text)]" />
          <span className="ec-label-tech">ATTEMPTS</span>
        </div>
        <div className="text-3xl font-bold text-[var(--ec-text-primary)]">{totalAttempts}</div>
      </div>
      <div className="ec-card p-5">
        <div className="mb-2 flex items-center gap-2 text-[var(--ec-text-secondary)]">
          <TrendingUp className="h-4 w-4 text-[var(--ec-chip-info-text)]" />
          <span className="ec-label-tech">CLASS AVERAGE</span>
        </div>
        <div className="text-3xl font-bold text-[var(--ec-text-primary)]">
          {avgScore.toFixed(0)}%
        </div>
      </div>
    </div>
  )
}
