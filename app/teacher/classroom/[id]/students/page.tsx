'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { StudentCard } from '@/components/teacher/StudentCard'
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
    <div className="mx-auto max-w-7xl px-6 py-12">
      <Link
        href={`/teacher/classroom/${id}`}
        className="mb-6 inline-block text-sm text-slate-400 hover:text-white"
      >
        ← Back to analytics
      </Link>
      <div className="ec-label-tech mb-3">STUDENTS</div>
      <h1 className="mb-8 text-3xl font-bold text-white">Class roster</h1>

      {loading && <p className="text-slate-400">Loading students...</p>}

      {!loading && students.length === 0 && (
        <div className="ec-card p-8 text-center text-slate-400">
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
    </div>
  )
}
