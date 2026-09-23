'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  NO_DATA,
  attemptSummary,
  hasMarkedWork,
  percentOrDash,
} from '@/lib/teacher/stat-display'
import {
  TeacherBackLink,
  TeacherPageContainer,
  TeacherPageHeader,
} from '@/components/teacher/TeacherPageChrome'
import { CountUp } from '@/components/ui/CountUp'
import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import type { StudentQuadrantMetric } from '@/lib/teacher-analytics'
import { StudentDueList } from '@/components/teacher/StudentDueList'

export default function StudentDetailPage() {
  const { id, studentId } = useParams<{ id: string; studentId: string }>()
  const [student, setStudent] = useState<StudentQuadrantMetric | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const r = await fetch(`/api/teacher/classroom/${id}/quadrants`, {
        cache: 'no-store',
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setStudent(null)
        setLoadError(d.error || 'Could not load this student. Try again.')
        return
      }
      const found = ((d.students || []) as StudentQuadrantMetric[]).find(
        (s) => s.studentId === studentId
      )
      setStudent(found || null)
      if (!found) setLoadError('')
    } catch {
      setStudent(null)
      setLoadError('Could not load this student. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [id, studentId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <TeacherPageContainer className="ms-teacher-student max-w-4xl">
        <div aria-busy aria-label="Loading student profile">
          {/* Back link, eyebrow, name, lead; three stat cards; the due-now card. */}
          <SkeletonLine className="mb-6 h-4 w-28" />
          <SkeletonLine className="mb-3 h-3 w-32" />
          <SkeletonBlock className="h-10 w-72 max-w-full sm:h-11" />
          <SkeletonLine className="mb-8 mt-3 h-4 w-64 max-w-full sm:mb-10" />
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SkeletonBlock className="h-[92px] w-full" />
            <SkeletonBlock className="h-[92px] w-full" />
            <SkeletonBlock className="h-[92px] w-full" />
          </div>
          <SkeletonBlock className="h-40 w-full" />
        </div>
      </TeacherPageContainer>
    )
  }

  if (loadError) {
    return (
      <TeacherPageContainer className="ms-teacher-student max-w-4xl">
        <TeacherBackLink href={`/teacher/classroom/${id}/students`}>
          ← Back to roster
        </TeacherBackLink>
        <div className="ms-teacher-error" role="alert">
          <p className="font-semibold text-[var(--ec-text-primary)]">Student unavailable</p>
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
              href={`/teacher/classroom/${id}/students`}
              className="ec-btn-secondary inline-flex min-h-[44px] items-center"
            >
              Back to roster
            </Link>
          </div>
        </div>
      </TeacherPageContainer>
    )
  }

  if (!student) {
    return (
      <TeacherPageContainer className="ms-teacher-student max-w-4xl">
        <TeacherBackLink href={`/teacher/classroom/${id}/students`}>
          ← Back to roster
        </TeacherBackLink>
        <div className="ms-teacher-empty ec-land">
          <span className="ms-teacher-empty__icon" aria-hidden>
            <span className="font-mono text-sm font-bold tracking-wide">N</span>
          </span>
          <p className="ms-teacher-empty__title">Student not found in this classroom.</p>
          <Link
            href={`/teacher/classroom/${id}/students`}
            className="ec-btn-secondary mt-2 inline-flex min-h-[44px] items-center"
          >
            Back to roster
          </Link>
        </div>
      </TeacherPageContainer>
    )
  }

  const marked = hasMarkedWork(student.attemptCount)

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
            Predicted grade: {student.predictedGrade} ·{' '}
            {attemptSummary(student.attemptCount, student.accuracy)}
          </>
        }
      />

      <div className="ec-land mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Every figure here is derived from marked work, so with none they are
            unknown rather than zero — see lib/teacher/stat-display. The known
            figures count up as the page lands; the dash never does. */}
        <div className="ec-card ec-card--paper p-5">
          <div className="ec-label-tech mb-2">ACCURACY</div>
          <div className="text-2xl font-bold tabular-nums text-[var(--ec-text-primary)]">
            {marked && Number.isFinite(student.accuracy) ? (
              <>
                <CountUp value={Math.round(student.accuracy)} />%
              </>
            ) : (
              percentOrDash(student.accuracy, student.attemptCount)
            )}
          </div>
        </div>
        <div className="ec-card ec-card--paper p-5">
          <div className="ec-label-tech mb-2">SPEED</div>
          <div className="text-2xl font-bold tabular-nums text-[var(--ec-text-primary)]">
            {marked ? (
              <>
                <CountUp value={student.timePerMark} decimals={1} /> min/mark
              </>
            ) : (
              NO_DATA
            )}
          </div>
        </div>
        <div className="ec-card ec-card--paper p-5">
          <div className="ec-label-tech mb-2">COVERAGE</div>
          <div className="text-2xl font-bold tabular-nums text-[var(--ec-text-primary)]">
            {marked && Number.isFinite(student.coverage) ? (
              <>
                <CountUp value={Math.round(student.coverage)} />%
              </>
            ) : (
              percentOrDash(student.coverage, student.attemptCount)
            )}
          </div>
        </div>
      </div>

      <div className="ec-land ec-land--1 mb-8">
        <StudentDueList
          classroomId={id}
          studentId={studentId}
          studentName={student.name}
        />
      </div>

      {student.biggestDeficit && (
        <div className="ec-card ec-card--paper ec-land ec-land--2 p-6">
          <div className="ec-label-tech mb-2 ec-score-low">BIGGEST DEFICIT</div>
          <h3 className="text-title">
            {student.biggestDeficit.name}
          </h3>
          <p className="mt-1 font-mono text-sm tabular-nums text-[var(--ec-text-secondary)]">
            {student.biggestDeficit.code} ·{' '}
            {student.biggestDeficit.percentage.toFixed(0)}% mastery
          </p>
        </div>
      )}
    </TeacherPageContainer>
  )
}
