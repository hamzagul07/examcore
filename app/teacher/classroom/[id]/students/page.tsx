'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { StudentCard } from '@/components/teacher/StudentCard'
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

      {loading && <p className="text-[var(--ec-text-secondary)]">Loading students...</p>}

      {!loading && students.length === 0 && (
        <div className="ec-card p-8 text-center text-[var(--ec-text-secondary)]">
          No students in this classroom yet.
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
