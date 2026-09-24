'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

import { ClassroomSummary } from '@/components/teacher/ClassroomSummary'
import { ClassBlindspots } from '@/components/teacher/ClassBlindspots'
import { ClassDueList } from '@/components/teacher/ClassDueList'
import { GradeRiskMatrix } from '@/components/teacher/GradeRiskMatrix'
import { ReviewQueueList } from '@/components/teacher/ReviewQueueList'
import { InviteCard } from '@/components/teacher/InviteCard'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { attemptSummary } from '@/lib/teacher/stat-display'
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
  name?: string
  description?: string | null
}

interface RosterStudent {
  id: string
  name: string
  attemptCount: number
  accuracy: number
  dueCount?: number
}

async function fetchJson(url: string): Promise<{ ok: boolean; data: unknown }> {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    const data = await r.json().catch(() => ({}))
    return { ok: r.ok, data }
  } catch {
    return { ok: false, data: null }
  }
}

export default function ClassroomPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<ClassroomData | null>(null)
  const [classroom, setClassroom] = useState<ClassroomInfo | null>(null)
  const [students, setStudents] = useState<RosterStudent[]>([])
  const [loadError, setLoadError] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true)
    setLoadError('')
    setInviteError('')

    const [analyticsRes, blindspotsRes, quadrantsRes, classroomRes, studentsRes] =
      await Promise.all([
        fetchJson(`/api/teacher/classroom/${id}/analytics`),
        fetchJson(`/api/teacher/classroom/${id}/blindspots`),
        fetchJson(`/api/teacher/classroom/${id}/quadrants`),
        fetchJson(`/api/teacher/classroom/${id}`),
        fetchJson(`/api/teacher/classroom/${id}/students`),
      ])

    if (signal?.cancelled) return

    const analytics = analyticsRes.data as ClassroomData['analytics'] | null
    if (!analyticsRes.ok || !analytics || typeof analytics.classroomName !== 'string') {
      setLoadError('Could not load this classroom. Check the link or try again.')
      setData(null)
      setClassroom(null)
      setInviteError('')
      setLoading(false)
      return
    }

    const blindspots = (blindspotsRes.data || { topics: [] }) as ClassroomData['blindspots']
    const quadrants = (quadrantsRes.data || { students: [] }) as ClassroomData['quadrants']
    const classroomPayload = classroomRes.data as { classroom?: ClassroomInfo } | null
    const studentsPayload = studentsRes.data as { students?: RosterStudent[] } | null

    setData({
      analytics,
      blindspots: { topics: blindspots.topics || [] },
      quadrants: { students: quadrants.students || [] },
    })
    if (!classroomRes.ok || !classroomPayload?.classroom?.invite_code) {
      setClassroom(null)
      setInviteError(
        classroomRes.ok
          ? 'This classroom has no invite code yet. Refresh or try again.'
          : 'Could not load the invite code. Try again to share it with your class.'
      )
    } else {
      setClassroom(classroomPayload.classroom)
      setInviteError('')
    }
    setStudents(studentsPayload?.students || [])
    setLoading(false)
  }, [id])

  useEffect(() => {
    const signal = { cancelled: false }
    void load(signal)
    return () => {
      signal.cancelled = true
    }
  }, [load])

  useSetAIContext(
    {
      type: 'teacher_dashboard',
      data: { classMetrics: data },
    },
    [data]
  )

  if (loading) {
    return (
      <TeacherPageContainer className="ms-teacher-classroom">
        <div aria-busy aria-label="Loading classroom analytics">
          {/* Desk head: eyebrow, class name, note, three tally cells; two actions on
              the right. Then the invite slip, the roster, and the first analytics
              card — the shapes the real page paints in that order. */}
          <div className="ms-teacher-desk-head">
            <div className="min-w-0 flex-1">
              <SkeletonLine className="mb-3 h-3 w-40" />
              <SkeletonBlock className="h-10 w-72 max-w-full sm:h-11" />
              <SkeletonLine className="mt-2 h-4 w-56 max-w-full" />
              <div className="ms-teacher-tally">
                <SkeletonBlock className="h-[74px] w-full" />
                <SkeletonBlock className="h-[74px] w-full" />
                <SkeletonBlock className="h-[74px] w-full" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <SkeletonBlock className="h-11 w-56" />
              <SkeletonBlock className="h-11 w-40" />
            </div>
          </div>
          <SkeletonBlock className="mb-7 h-40 w-full" />
          <div className="ms-teacher-roster">
            <SkeletonBlock className="mb-4 h-7 w-40" />
            <div className="ms-teacher-roster__list">
              <SkeletonBlock className="h-[52px] w-full" />
              <SkeletonBlock className="h-[52px] w-full" />
              <SkeletonBlock className="h-[52px] w-full" />
            </div>
          </div>
          <SkeletonBlock className="mb-8 h-64 w-full" />
        </div>
      </TeacherPageContainer>
    )
  }

  if (loadError || !data) {
    return (
      <TeacherPageContainer className="ms-teacher-classroom">
        <div className="ms-teacher-error" role="alert">
          <p className="font-semibold text-[var(--ec-text-primary)]">Classroom unavailable</p>
          <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">
            {loadError || 'Could not load this classroom.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="ec-btn-primary inline-flex min-h-[44px] items-center"
            >
              Try again
            </button>
            <Link
              href="/teacher/dashboard"
              className="ec-btn-secondary inline-flex min-h-[44px] items-center"
            >
              &lt;- Back to classrooms
            </Link>
          </div>
        </div>
      </TeacherPageContainer>
    )
  }

  const isDemo =
    /demo|example class/i.test(
      `${data.analytics.classroomName} ${classroom?.description ?? ''}`
    )

  return (
    <TeacherPageContainer className="ms-teacher-classroom">
      {isDemo ? (
        <aside className="ms-teacher-demo-flag ec-land mb-6" role="status">
          <p className="flex items-center gap-2 font-semibold text-[var(--ec-text-primary)]">
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              DEMO
            </span>
            Example data
          </p>
          <p className="mt-1 text-sm text-[var(--ec-text-secondary)]">
            This classroom is seeded with simulated students — not your real cohort.
          </p>
        </aside>
      ) : null}
      <div className="ms-teacher-desk-head ec-land">
        <div>
          <p className="ec-eyebrow mb-3">Classroom analytics</p>
          <h1 className="text-headline">{data.analytics.classroomName}</h1>
          <span className="ms-teacher-desk-head__note" aria-hidden>
            {isDemo ? 'demo class — not your students' : 'marks the cohort actually drops'}
          </span>
          <ClassroomSummary
            studentCount={data.analytics.studentCount}
            totalAttempts={data.analytics.totalAttempts}
            avgScore={data.analytics.avgScore}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/teacher/classroom/${id}/gaps`}
            className="ec-btn-primary inline-flex min-h-[44px] items-center gap-2 text-sm"
          >
            <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
              ¶
            </span>
            Where the class loses marks
          </Link>
          <Link
            href={`/teacher/classroom/${id}/students`}
            className="ec-btn-secondary inline-flex min-h-[44px] items-center gap-2 text-sm"
          >
            <span
              className="font-mono text-[11px] font-bold tracking-wide text-[var(--ec-brand)]"
              aria-hidden
            >
              N
            </span>
            View all students
          </Link>
        </div>
      </div>

      {classroom?.invite_code ? (
        <div id="classroom-invite" className="ec-land ec-land--1 scroll-mt-24">
          <InviteCard classroom={classroom} />
        </div>
      ) : null}
      {inviteError ? (
        <div className="ms-teacher-error ec-land ec-land--1 mb-6" role="alert">
          <p className="font-semibold text-[var(--ec-text-primary)]">Invite code unavailable</p>
          <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">{inviteError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="ec-btn-secondary mt-4 inline-flex min-h-[44px] items-center"
          >
            Try again
          </button>
        </div>
      ) : null}

      <section
        className="ms-teacher-roster ec-land ec-land--2"
        aria-labelledby="classroom-roster-heading"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="classroom-roster-heading" className="text-title tabular-nums">
            Students ({students.length})
          </h2>
        </div>

        {students.length === 0 ? (
          <div className="ms-teacher-empty">
            <span className="ms-teacher-empty__icon">
              <span className="font-mono text-sm font-bold tracking-wide" aria-hidden>
                N
              </span>
            </span>
            <p className="ms-teacher-empty__title">No students yet</p>
            <p className="ms-teacher-empty__body">
              {inviteError
                ? 'Load the invite code above first, then share it with your class. Their marked work appears here as they go.'
                : 'Read the code above out in your next lesson, or send the share link. Their marked work appears here as they go.'}
            </p>
            {inviteError ? (
              <button
                type="button"
                onClick={() => void load()}
                className="ec-btn-primary mt-2 inline-flex min-h-[44px] items-center"
              >
                Try again
              </button>
            ) : (
              <a
                href="#classroom-invite"
                className="ec-btn-primary mt-2 inline-flex min-h-[44px] items-center gap-2"
              >
                <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
                  JOIN
                </span>
                Share the invite code
              </a>
            )}
          </div>
        ) : (
          <ul className="ms-teacher-roster__list">
            {students.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/teacher/classroom/${id}/students/${s.id}`}
                  className="ms-teacher-roster__row"
                >
                  <span>
                    <span className="block font-medium text-[var(--ec-text-primary)]">{s.name}</span>
                    <span className="block text-xs tabular-nums text-[var(--ec-text-secondary)]">
                      {attemptSummary(s.attemptCount, s.accuracy)}
                      {(s.dueCount ?? 0) > 0
                        ? ` · ${s.dueCount} due`
                        : ''}
                    </span>
                  </span>
                  <span className="ms-teacher-roster__trail">
                    {(s.dueCount ?? 0) > 0 ? (
                      <span className="ms-roster-due" aria-label={`${s.dueCount} topics due`}>
                        {s.dueCount} due
                      </span>
                    ) : null}
                    <span className="font-mono text-[11px] font-bold text-[var(--ec-brand)]" aria-hidden>
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="ec-land ec-land--3 mb-8">
        <ClassBlindspots classroomId={id} blindspots={data.blindspots.topics || []} />
      </div>

      {/* The due list and review queue fetch on their own and land when they
          arrive, so they are not staggered with the rest of the page. */}
      <div className="mb-8">
        <ClassDueList classroomId={id} />
      </div>

      <div className="ec-land ec-land--4 mb-8">
        <GradeRiskMatrix students={data.quadrants.students || []} classroomId={id} />
      </div>

      <ReviewQueueList classroomId={id} />
    </TeacherPageContainer>
  )
}
