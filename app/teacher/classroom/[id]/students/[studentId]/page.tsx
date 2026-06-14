'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  TeacherBackLink,
  TeacherPageContainer,
  TeacherPageHeader,
} from '@/components/teacher/TeacherPageChrome'
import type { StudentQuadrantMetric } from '@/lib/teacher-analytics'

export default function StudentDetailPage() {
  const { id, studentId } = useParams<{ id: string; studentId: string }>()
  const [student, setStudent] = useState<StudentQuadrantMetric | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/teacher/classroom/${id}/quadrants`)
      .then((r) => r.json())
      .then((d) => {
        const found = (d.students || []).find(
          (s: StudentQuadrantMetric) => s.studentId === studentId
        )
        setStudent(found || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id, studentId])

  if (loading) {
    return (
      <TeacherPageContainer className="ms-teacher-student max-w-4xl">
        <p className="text-[var(--ec-text-secondary)]">Loading student profile...</p>
      </TeacherPageContainer>
    )
  }

  if (!student) {
    return (
      <TeacherPageContainer className="ms-teacher-student max-w-4xl">
        <TeacherBackLink href={`/teacher/classroom/${id}/students`}>
          ← Back to roster
        </TeacherBackLink>
        <p className="text-[var(--ec-text-secondary)]">Student not found in this classroom.</p>
      </TeacherPageContainer>
    )
  }

  return (
    <TeacherPageContainer className="ms-teacher-student max-w-4xl">
      <TeacherBackLink href={`/teacher/classroom/${id}/students`}>
        ← Back to roster
      </TeacherBackLink>

      <TeacherPageHeader
        label="STUDENT PROFILE"
        title={student.name}
        lead={
          <>
            Predicted grade: {student.predictedGrade} · {student.attemptCount}{' '}
            attempts · {student.accuracy.toFixed(0)}% accuracy
          </>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="ec-card p-5">
          <div className="ec-label-tech mb-2">ACCURACY</div>
          <div className="text-2xl font-bold text-[var(--ec-text-primary)]">
            {student.accuracy.toFixed(0)}%
          </div>
        </div>
        <div className="ec-card p-5">
          <div className="ec-label-tech mb-2">SPEED</div>
          <div className="text-2xl font-bold text-[var(--ec-text-primary)]">
            {student.timePerMark.toFixed(1)} min/mark
          </div>
        </div>
        <div className="ec-card p-5">
          <div className="ec-label-tech mb-2">COVERAGE</div>
          <div className="text-2xl font-bold text-[var(--ec-text-primary)]">
            {student.coverage.toFixed(0)}%
          </div>
        </div>
      </div>

      {student.biggestDeficit && (
        <div className="ec-card p-6">
          <div className="ec-label-tech mb-2 ec-score-low">BIGGEST DEFICIT</div>
          <h3 className="text-xl font-bold text-[var(--ec-text-primary)]">
            {student.biggestDeficit.name}
          </h3>
          <p className="mt-1 font-mono text-sm text-[var(--ec-text-secondary)]">
            {student.biggestDeficit.code} ·{' '}
            {student.biggestDeficit.percentage.toFixed(0)}% mastery
          </p>
        </div>
      )}
    </TeacherPageContainer>
  )
}
