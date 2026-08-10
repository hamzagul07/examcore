'use client'

import Link from 'next/link'
import { attemptSummary } from '@/lib/teacher/stat-display'
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
  dueCount?: number
}

export function StudentCard({
  id,
  name,
  accuracy,
  attemptCount,
  predictedGrade,
  quadrant,
  classroomId,
  dueCount = 0,
}: StudentCardProps) {
  return (
    <Link
      href={`/teacher/classroom/${classroomId}/students/${id}`}
      className="ec-card ec-card--paper ec-card-interactive block min-h-[72px] p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-[var(--ec-text-primary)]">{name}</h3>
          <p className="mt-1 text-sm text-[var(--ec-text-secondary)]">
            {attemptSummary(attemptCount, accuracy)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="rounded-lg ec-tint-success-chip px-2 py-1 text-sm font-bold">
            {predictedGrade}
          </span>
          {dueCount > 0 ? (
            <span
              className="ms-roster-due"
              title={`${dueCount} topic${dueCount === 1 ? '' : 's'} due`}
            >
              {dueCount} due
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-3 text-xs text-[var(--ec-text-secondary)]">
        {QUADRANT_LABELS[quadrant]}
      </div>
    </Link>
  )
}
