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
import { useSetAIContext } from '@/lib/omni-ai/context'
import { SidebarChat } from '@/components/omni-ai/SidebarChat'
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
      <div className="p-12 text-slate-400">Loading classroom analytics...</div>
    )
  }

  return (
    <>
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="ec-label-tech mb-3">CLASSROOM ANALYTICS</div>
            <h1 className="text-huge gradient-text">
              {data.analytics.classroomName}
            </h1>
            <ClassroomSummary
              studentCount={data.analytics.studentCount}
              totalAttempts={data.analytics.totalAttempts}
              avgScore={data.analytics.avgScore}
            />
          </div>
          <Link
            href={`/teacher/classroom/${id}/students`}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
          >
            <Users className="h-4 w-4 text-emerald-400" />
            View all students
          </Link>
        </div>

        {classroom?.invite_code && <InviteCard classroom={classroom} />}

        <div className="ec-card mb-8 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">
              Students ({students.length})
            </h3>
          </div>

          {students.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto mb-3 h-12 w-12 text-slate-600" />
              <p className="text-slate-400">
                No students yet. Share the invite code above.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((s) => (
                <Link
                  key={s.id}
                  href={`/teacher/classroom/${id}/students/${s.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10"
                >
                  <div>
                    <div className="font-medium text-white">{s.name}</div>
                    <div className="text-xs text-slate-400">
                      {s.attemptCount} attempts · {s.accuracy.toFixed(0)}% avg
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500" />
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
      </div>
      <SidebarChat />
    </>
  )
}
