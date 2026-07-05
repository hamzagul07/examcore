'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Users } from 'lucide-react'
import { StudentCard } from '@/components/teacher/StudentCard'
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
}

export default function ClassroomStudentsPage() {
  const { id } = useParams<{ id: string }>()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/teacher/classroom/${id}/students`)
      .then((r) => r.json())
      .then((d) => {
        setStudents(d.students || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  return (
    <TeacherPageContainer className="ms-teacher-roster">
      <TeacherBackLink href={`/teacher/classroom/${id}`}>
        ← Back to analytics
      </TeacherBackLink>
      <TeacherPageHeader label="STUDENTS" title="Class roster" />

      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-hidden>
          <SkeletonBlock className="h-40 w-full" />
          <SkeletonBlock className="h-40 w-full" />
          <SkeletonBlock className="h-40 w-full" />
        </div>
      )}

      {!loading && students.length === 0 && (
        <div className="ec-card relative overflow-hidden p-10 text-center">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-[90px]"
            style={{ background: 'color-mix(in srgb, var(--ec-brand) 14%, transparent)' }}
            aria-hidden
          />
          <div className="relative">
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: 'var(--ec-brand-muted)', color: 'var(--ec-brand)' }}
            >
              <Users className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="text-h3 text-[var(--ec-text-primary)]">No students yet</h2>
            <p className="text-body mx-auto mt-2 max-w-sm text-[var(--ec-text-secondary)]">
              Share your classroom invite code and students will appear here as soon as
              they join.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          />
        ))}
      </div>
    </TeacherPageContainer>
  )
}
