'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { formatInviteCode } from '@/lib/teacher/invite-code'
import { useSetAIContext } from '@/lib/omni-ai/context'
import type { TeacherClassroomRow } from '@/lib/teacher/list-classrooms'

type Props = {
  initial: { classrooms: TeacherClassroomRow[] } | { error: string }
}

function isDemoClassroom(c: TeacherClassroomRow): boolean {
  const hay = `${c.name} ${c.description ?? ''}`.toLowerCase()
  return hay.includes('demo') || hay.includes('example class')
}

export function TeacherDashboardClient({ initial }: Props) {
  const [classrooms, setClassrooms] = useState(
    'classrooms' in initial ? initial.classrooms : []
  )
  const [error, setError] = useState(
    'error' in initial ? initial.error : null
  )
  const [seeding, setSeeding] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useSetAIContext({ type: 'teacher_dashboard', data: {} }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const r = await fetch('/api/teacher/classrooms', { cache: 'no-store' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(d.error || 'Could not load classrooms.')
        return
      }
      setClassrooms((d.classrooms || []) as TeacherClassroomRow[])
    } catch {
      setError('Could not reach the server.')
    } finally {
      setRefreshing(false)
    }
  }, [])

  async function seedDemo() {
    setSeeding(true)
    setError(null)
    try {
      const res = await fetch('/api/teacher/seed-demo', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (data.success && data.classroom_id) {
        window.location.href = `/teacher/classroom/${data.classroom_id}`
        return
      }
      setError(data.error || 'Could not build the example class.')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setSeeding(false)
    }
  }

  const empty = !error && classrooms.length === 0

  return (
    <TeacherPageContainer className="ms-teacher-page">
      <header className="ms-teacher-desk-head">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <p className="ec-eyebrow mb-0">Teacher desk</p>
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              CLS
            </span>
          </div>
          <h1 className="text-headline">Your classrooms</h1>
          <span className="ms-teacher-desk-head__note" aria-hidden>
            one slip per class — code on the face
          </span>
        </div>
        {!empty && !error ? (
          <Link
            href="/teacher/classrooms/new"
            className="ec-btn-primary inline-flex min-h-[44px] items-center gap-2"
          >
            <span className="font-mono text-[11px] font-bold" aria-hidden>
              +
            </span>
            New class
          </Link>
        ) : null}
      </header>

      {error ? (
        <div className="ms-teacher-error mb-6" role="alert">
          <p className="font-semibold text-[var(--ec-text-primary)]">Couldn’t load classrooms</p>
          <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">{error}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={refreshing}
              onClick={() => void refresh()}
              className="ec-btn-primary inline-flex min-h-[44px] items-center"
            >
              {refreshing ? 'Retrying…' : 'Try again'}
            </button>
            <Link
              href="/contact"
              className="ec-btn-ghost inline-flex min-h-[44px] items-center"
            >
              Contact support
            </Link>
          </div>
        </div>
      ) : null}

      {empty ? (
        <div className="ms-teacher-empty">
          <span className="ms-teacher-empty__icon" aria-hidden>
            <span className="font-mono text-sm font-bold tracking-wide">CL</span>
          </span>
          <h2 className="ms-teacher-empty__title">Make your first class</h2>
          <p className="ms-teacher-empty__body">
            You&apos;ll get a code to read out. Once a few students have marked something, this is
            where you&apos;ll see what the class as a whole keeps dropping marks on.
          </p>
          <div className="ms-teacher-dash-actions mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/teacher/classrooms/new"
              className="ec-btn-primary w-full justify-center sm:w-auto"
            >
              <span className="mr-2 font-mono text-[11px] font-bold tracking-wide" aria-hidden>
                +
              </span>
              Create a class
            </Link>
            <button
              type="button"
              onClick={() => void seedDemo()}
              disabled={seeding}
              className="ec-btn-secondary w-full justify-center disabled:opacity-50 sm:w-auto"
            >
              <span className="mr-2 font-mono text-[11px] font-bold tracking-wide" aria-hidden>
                DEMO
              </span>
              {seeding ? 'Building example…' : 'Show me an example class'}
            </button>
          </div>
        </div>
      ) : null}

      {!error && classrooms.length > 0 ? (
        <ul className="ms-teacher-class-list">
          {classrooms.map((c) => {
            const demo = isDemoClassroom(c)
            return (
              <li key={c.id}>
                <Link href={`/teacher/classroom/${c.id}`} className="ms-teacher-class-slip">
                  <span className="ms-teacher-class-slip__stamp" aria-hidden>
                    {demo ? 'DEMO' : 'CL'}
                  </span>
                  <span>
                    <h2 className="ms-teacher-class-slip__name">
                      {c.name}
                      {demo ? (
                        <span className="ml-2 font-mono text-[11px] font-bold tracking-wide text-[var(--ec-logo-crimson,var(--ec-ink-crimson))]">
                          EXAMPLE DATA
                        </span>
                      ) : null}
                    </h2>
                    <p className="ms-teacher-class-slip__meta">
                      {[c.subject, c.level].filter(Boolean).join(' · ') || 'Class'}
                      {' · '}
                      {c.studentCount === 1 ? '1 student' : `${c.studentCount || 0} students`}
                      {c.invite_code ? (
                        <>
                          {' · '}
                          <span className="ms-teacher-class-slip__code">
                            {formatInviteCode(c.invite_code)}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </span>
                  <span className="ms-teacher-class-slip__go" aria-hidden>
                    Open -&gt;
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}
    </TeacherPageContainer>
  )
}
