'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { StudentCard } from '@/components/teacher/StudentCard'
import { AppEmptyState } from '@/components/ui/AppEmptyState'
import { SkeletonBlock } from '@/components/ui/PageSkeleton'
import {
  TeacherBackLink,
  TeacherPageContainer,
  TeacherPageHeader,
} from '@/components/teacher/TeacherPageChrome'
import type { StudentQuadrantMetric } from '@/lib/teacher-analytics'

interface Student {
  id: string
  name: string
  accuracy: number
  attemptCount: number
  predictedGrade: string
  quadrant: StudentQuadrantMetric['quadrant']
  coverage: number
  dueCount?: number
}

export default function ClassroomStudentsPage() {
  const { id } = useParams<{ id: string }>()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const r = await fetch(`/api/teacher/classroom/${id}/students`, {
        cache: 'no-store',
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setStudents([])
        setLoadError(d.error || 'Could not load the class roster. Try again.')
        return
      }
      setStudents((d.students || []) as Student[])
    } catch {
      setStudents([])
      setLoadError('Could not load the class roster. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <TeacherPageContainer className="ms-teacher-roster">
      <TeacherBackLink href={`/teacher/classroom/${id}`}>
        ← Back to analytics
      </TeacherBackLink>
      <TeacherPageHeader label="STUDENTS" title="Class roster" />

      {loading && (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          aria-busy
          aria-label="Loading the class roster"
        >
          {/* A StudentCard is p-5 with a name, a summary line and a quadrant
              label — about 116px tall. */}
          <SkeletonBlock className="h-[116px] w-full" />
          <SkeletonBlock className="h-[116px] w-full" />
          <SkeletonBlock className="h-[116px] w-full" />
        </div>
      )}

      {!loading && loadError ? (
        <div className="ms-teacher-error" role="alert">
          <p className="font-semibold text-[var(--ec-text-primary)]">Roster unavailable</p>
          <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">{loadError}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="ec-btn-primary inline-flex min-h-[44px] items-center"
            >
              Try again
            </button>
            <Link
              href={`/teacher/classroom/${id}`}
              className="ec-btn-secondary inline-flex min-h-[44px] items-center"
            >
              Back to classroom
            </Link>
          </div>
        </div>
      ) : null}

      {!loading && !loadError && students.length === 0 && (
        <div className="ec-land">
          <AppEmptyState
            variant="no-data"
            title="No students yet"
            body="Share your classroom invite code and students will appear here as soon as they join."
            ctaLabel="Share the invite code"
            ctaHref={`/teacher/classroom/${id}#classroom-invite`}
          />
        </div>
      )}

      {!loading && !loadError && students.length > 0 ? (
        <div className="ec-land grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => (
            <StudentCard
              key={s.id}
              id={s.id}
              name={s.name}
              accuracy={s.accuracy}
              attemptCount={s.attemptCount}
              predictedGrade={s.predictedGrade}
              quadrant={s.quadrant}
              classroomId={id}
              dueCount={s.dueCount ?? 0}
            />
          ))}
        </div>
      ) : null}
    </TeacherPageContainer>
  )
}
