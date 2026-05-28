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
        <div className="mb-2 flex items-center gap-2 text-slate-400">
          <Users className="h-4 w-4 text-emerald-400" />
          <span className="ec-label-tech">STUDENTS</span>
        </div>
        <div className="text-3xl font-bold text-white">{studentCount}</div>
      </div>
      <div className="ec-card p-5">
        <div className="mb-2 flex items-center gap-2 text-slate-400">
          <FileText className="h-4 w-4 text-violet-400" />
          <span className="ec-label-tech">ATTEMPTS</span>
        </div>
        <div className="text-3xl font-bold text-white">{totalAttempts}</div>
      </div>
      <div className="ec-card p-5">
        <div className="mb-2 flex items-center gap-2 text-slate-400">
          <TrendingUp className="h-4 w-4 text-cyan-400" />
          <span className="ec-label-tech">CLASS AVERAGE</span>
        </div>
        <div className="text-3xl font-bold text-white">
          {avgScore.toFixed(0)}%
        </div>
      </div>
    </div>
  )
}
