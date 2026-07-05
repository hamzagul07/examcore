'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Users, ArrowRight } from 'lucide-react'
import { ClassroomSummary } from '@/components/teacher/ClassroomSummary'
import { ClassBlindspotRadar } from '@/components/teacher/ClassBlindspotRadar'
import { GradeRiskMatrix } from '@/components/teacher/GradeRiskMatrix'
import { ReviewQueueList } from '@/components/teacher/ReviewQueueList'
import { InviteCard } from '@/components/teacher/InviteCard'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { useSetAIContext } from '@/lib/omni-ai/context'
import type { StudentQuadrantMetric } from '@/lib/teacher-analytics'

interface ClassroomData {
  analytics: {
    classroomName: string
    studentCount: number
    totalAttempts: number
    avgScore: number
  }
  blindspots: {
    topics: Array<{
      code: string
      name: string
      paper: string
      avgMastery: number
      studentsAttempted: number
      totalStudents: number
    }>
  }
  quadrants: {
    students: StudentQuadrantMetric[]
  }
}

interface ClassroomInfo {
  invite_code: string
}

interface RosterStudent {
  id: string
  name: string
  attemptCount: number
  accuracy: number
}

export default function ClassroomPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<ClassroomData | null>(null)
  const [classroom, setClassroom] = useState<ClassroomInfo | null>(null)
  const [students, setStudents] = useState<RosterStudent[]>([])

  useEffect(() => {
    Promise.all([
      fetch(`/api/teacher/classroom/${id}/analytics`).then((r) => r.json()),
      fetch(`/api/teacher/classroom/${id}/blindspots`).then((r) => r.json()),
      fetch(`/api/teacher/classroom/${id}/quadrants`).then((r) => r.json()),
      fetch(`/api/teacher/classroom/${id}`).then((r) => r.json()),
      fetch(`/api/teacher/classroom/${id}/students`).then((r) => r.json()),
    ]).then(([analytics, blindspots, quadrants, classroomRes, studentsRes]) => {
      setData({ analytics, blindspots, quadrants })
      if (classroomRes.classroom) {
        setClassroom(classroomRes.classroom)
      }
      setStudents(studentsRes.students || [])
    })
  }, [id])

  useSetAIContext(
    {
      type: 'teacher_dashboard',
      data: { classMetrics: data },
    },
    [data]
  )

  if (!data) {
    return (
      <TeacherPageContainer className="ms-teacher-classroom">
        <div aria-busy aria-label="Loading classroom analytics">
          <SkeletonLine className="mb-3 h-3 w-40" />
          <SkeletonBlock className="mb-8 h-10 w-72 max-w-full" />
          <SkeletonBlock className="mb-8 h-32 w-full" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <SkeletonBlock className="h-64 w-full" />
            <SkeletonBlock className="h-64 w-full" />
          </div>
        </div>
      </TeacherPageContainer>
    )
  }

  return (
    <TeacherPageContainer className="ms-teacher-classroom">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ec-eyebrow mb-3">Classroom analytics</p>
          <h1 className="text-headline">{data.analytics.classroomName}</h1>
          <ClassroomSummary
            studentCount={data.analytics.studentCount}
            totalAttempts={data.analytics.totalAttempts}
            avgScore={data.analytics.avgScore}
          />
        </div>
        <Link
          href={`/teacher/classroom/${id}/students`}
          className="ec-btn-secondary inline-flex min-h-[44px] items-center gap-2 text-sm"
        >
          <Users className="h-4 w-4 ec-text-brand" />
          View all students
        </Link>
      </div>

      {classroom?.invite_code && <InviteCard classroom={classroom} />}

      <div className="ec-card mb-8 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-[var(--ec-text-primary)]">
            Students ({students.length})
          </h3>
        </div>

        {students.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="mx-auto mb-3 h-12 w-12 text-[var(--ec-text-secondary)] opacity-50" />
            <p className="text-[var(--ec-text-secondary)]">
              No students yet. Share the invite code above.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {students.map((s) => (
              <Link
                key={s.id}
                href={`/teacher/classroom/${id}/students/${s.id}`}
                className="flex min-h-[44px] items-center justify-between rounded-xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-4 transition-colors hover:bg-[var(--ec-brand-muted)]"
              >
                <div>
                  <div className="font-medium text-[var(--ec-text-primary)]">{s.name}</div>
                  <div className="text-xs text-[var(--ec-text-secondary)]">
                    {s.attemptCount} attempts · {s.accuracy.toFixed(0)}% avg
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--ec-text-secondary)]" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mb-8">
        <ClassBlindspotRadar
          classroomId={id}
          blindspots={data.blindspots.topics || []}
        />
      </div>

      <div className="mb-8">
        <GradeRiskMatrix students={data.quadrants.students || []} />
      </div>

      <ReviewQueueList classroomId={id} />
    </TeacherPageContainer>
  )
}
