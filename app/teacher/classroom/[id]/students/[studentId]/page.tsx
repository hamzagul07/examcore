'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
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
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-slate-400">Loading student profile...</p>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href={`/teacher/classroom/${id}/students`}
          className="mb-6 inline-block text-sm text-slate-400 hover:text-white"
        >
          ← Back to roster
        </Link>
        <p className="text-slate-400">Student not found in this classroom.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href={`/teacher/classroom/${id}/students`}
        className="mb-6 inline-block text-sm text-slate-400 hover:text-white"
      >
        ← Back to roster
      </Link>

      <div className="ec-label-tech mb-3">STUDENT PROFILE</div>
      <h1 className="mb-2 text-3xl font-bold text-white">{student.name}</h1>
      <p className="mb-8 text-slate-400">
        Predicted grade: {student.predictedGrade} · {student.attemptCount}{' '}
        attempts · {student.accuracy.toFixed(0)}% accuracy
      </p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="ec-card p-5">
          <div className="ec-label-tech mb-2">ACCURACY</div>
          <div className="text-2xl font-bold text-white">
            {student.accuracy.toFixed(0)}%
          </div>
        </div>
        <div className="ec-card p-5">
          <div className="ec-label-tech mb-2">SPEED</div>
          <div className="text-2xl font-bold text-white">
            {student.timePerMark.toFixed(1)} min/mark
          </div>
        </div>
        <div className="ec-card p-5">
          <div className="ec-label-tech mb-2">COVERAGE</div>
          <div className="text-2xl font-bold text-white">
            {student.coverage.toFixed(0)}%
          </div>
        </div>
      </div>

      {student.biggestDeficit && (
        <div className="ec-card p-6">
          <div className="ec-label-tech mb-2 text-red-400">BIGGEST DEFICIT</div>
          <h3 className="text-xl font-bold text-white">
            {student.biggestDeficit.name}
          </h3>
          <p className="mt-1 font-mono text-sm text-slate-400">
            {student.biggestDeficit.code} ·{' '}
            {student.biggestDeficit.percentage.toFixed(0)}% mastery
          </p>
        </div>
      )}
    </div>
  )
}
