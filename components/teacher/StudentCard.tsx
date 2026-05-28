'use client'

import Link from 'next/link'
import type { StudentQuadrantMetric } from '@/lib/teacher-analytics'

const QUADRANT_LABELS: Record<StudentQuadrantMetric['quadrant'], string> = {
  safe: 'Safe Zone',
  pacing_risk: 'Pacing Risk',
  careless_risk: 'Careless Risk',
  under_prepared: 'Under-Prepared',
}

interface StudentCardProps {
  id: string
  name: string
  accuracy: number
  attemptCount: number
  predictedGrade: string
  quadrant: StudentQuadrantMetric['quadrant']
  classroomId: string
}

export function StudentCard({
  id,
  name,
  accuracy,
  attemptCount,
  predictedGrade,
  quadrant,
  classroomId,
}: StudentCardProps) {
  return (
    <Link
      href={`/teacher/classroom/${classroomId}/students/${id}`}
      className="ec-card ec-card-interactive block p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-white">{name}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {attemptCount} attempt{attemptCount === 1 ? '' : 's'} ·{' '}
            {accuracy.toFixed(0)}% accuracy
          </p>
        </div>
        <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-sm font-bold text-emerald-400">
          {predictedGrade}
        </span>
      </div>
      <div className="mt-3 text-xs text-slate-500">
        {QUADRANT_LABELS[quadrant]}
      </div>
    </Link>
  )
}
