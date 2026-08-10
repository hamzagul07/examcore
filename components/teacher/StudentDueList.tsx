'use client'

import { useEffect, useState } from 'react'
import type { StudentDueTopic } from '@/lib/teacher/cohort-due'

const SOURCE_LABEL: Record<StudentDueTopic['source'], string> = {
  attempts: 'Needs a rematch',
  recall: 'Checked, not marked',
}

function daysOverdue(dueAt: string): string {
  const ms = Date.now() - Date.parse(dueAt)
  if (!Number.isFinite(ms) || ms < 0) return 'due now'
  const days = Math.floor(ms / 86_400_000)
  if (days <= 0) return 'due today'
  if (days === 1) return '1d overdue'
  return `${days}d overdue`
}

/**
 * Per-student due strip on the teacher profile — what is cooling for them now.
 */
export function StudentDueList({
  classroomId,
  studentId,
  studentName,
}: {
  classroomId: string
  studentId: string
  studentName: string
}) {
  const [topics, setTopics] = useState<StudentDueTopic[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetch(`/api/teacher/classroom/${classroomId}/students/${studentId}/due`, {
      cache: 'no-store',
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!active) return
        if (!r.ok) {
          setError(data.error || 'Could not load due topics.')
          setTopics([])
          return
        }
        setTopics((data.topics as StudentDueTopic[]) || [])
        setError('')
      })
      .catch(() => {
        if (!active) return
        setError('Could not load due topics.')
        setTopics([])
      })
    return () => {
      active = false
    }
  }, [classroomId, studentId])

  if (topics === null) {
    return (
      <section className="ms-student-due ec-card ec-card--paper p-6" aria-busy>
        <div className="mb-2 flex items-center gap-2">
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            DUE
          </span>
          <span className="ec-label-tech">Due now</span>
        </div>
        <p className="text-sm text-[var(--ec-text-secondary)]">Loading…</p>
      </section>
    )
  }

  if (error) {
    return (
      <div className="ms-teacher-error" role="alert">
        <p className="font-semibold text-[var(--ec-text-primary)]">Due list unavailable</p>
        <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">{error}</p>
      </div>
    )
  }

  if (topics.length === 0) {
    return (
      <section className="ms-student-due ec-card ec-card--paper p-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            DUE
          </span>
          <span className="ec-label-tech">Due now</span>
        </div>
        <h2 className="ms-student-due__title">Nothing due for {studentName}</h2>
        <p className="ms-student-due__sub">
          When they mark or finish a quick check, cooling topics will show up here.
        </p>
      </section>
    )
  }

  const first = studentName.trim().split(/\s+/)[0] || studentName

  return (
    <section className="ms-student-due ec-card ec-card--paper p-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="ec-ink-stamp ec-ink-stamp--crimson" aria-hidden>
          DUE
        </span>
        <span className="ec-label-tech">Due now</span>
      </div>
      <h2 className="ms-student-due__title">
        {topics.length} topic{topics.length === 1 ? '' : 's'} cooling for {first}
      </h2>
      <p className="ms-student-due__sub">
        Ask them to mark one of these — a single question resets the clock.
      </p>
      <ul className="ms-student-due__list">
        {topics.map((t) => (
          <li key={`${t.subjectCode}-${t.topicCode}`} className="ms-student-due__row">
            <div className="min-w-0">
              <p className="ms-student-due__name">
                {t.name}
                <span className="ms-student-due__code">
                  {' '}
                  · {t.subjectLabel} · {t.topicCode}
                </span>
              </p>
              <p className="ms-student-due__meta">
                {SOURCE_LABEL[t.source]} · {daysOverdue(t.dueAt)}
              </p>
            </div>
            <span
              className={`ms-student-due__badge${
                t.source === 'recall' ? ' ms-student-due__badge--recall' : ''
              }`}
            >
              {t.source === 'recall' ? 'Unmarked' : 'Rematch'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
