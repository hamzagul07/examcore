'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { CohortDueTopic } from '@/lib/teacher/cohort-due'
import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { InterventionGenerator } from './InterventionGenerator'

const SOURCE_LABEL: Record<CohortDueTopic['source'], string> = {
  attempts: 'From marked work',
  recall: 'Checked, not marked',
  both: 'Marked + unchecked',
}

/**
 * Topics cooling off across the roster — the teacher Due brain.
 * Loaded lazily so the desk still paints if the schedule tables are empty.
 */
export function ClassDueList({ classroomId }: { classroomId: string }) {
  const [topics, setTopics] = useState<CohortDueTopic[] | null>(null)
  const [students, setStudents] = useState(0)
  const [error, setError] = useState('')
  const [showIntervention, setShowIntervention] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/teacher/classroom/${classroomId}/due`, { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!active) return
        if (!r.ok) {
          setError('Could not load the class due list.')
          setTopics([])
          return
        }
        setTopics((data.topics as CohortDueTopic[]) || [])
        setStudents(typeof data.students === 'number' ? data.students : 0)
        setError('')
      })
      .catch(() => {
        if (!active) return
        setError('Could not load the class due list.')
        setTopics([])
      })
    return () => {
      active = false
    }
  }, [classroomId])

  if (topics === null) {
    return (
      <section
        className="ms-class-due ec-card ec-card--paper p-6 sm:p-8"
        aria-busy
        aria-label="Loading the class due list"
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            DUE
          </span>
          <span className="ec-label-tech">Class due list</span>
        </div>
        <p className="sr-only">Loading topics that are cooling off…</p>
        {/* Title, sub, then rows at the real row height (name, meta, bar). */}
        <SkeletonBlock className="h-7 w-72 max-w-full" />
        <SkeletonLine className="mt-2 h-4 w-96 max-w-full" />
        <div className="ms-class-due__list mt-5">
          <SkeletonBlock className="h-[58px] w-full" />
          <SkeletonBlock className="h-[58px] w-full" />
          <SkeletonBlock className="h-[58px] w-full" />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <div className="ms-teacher-error ec-land" role="alert">
        <p className="font-semibold text-[var(--ec-text-primary)]">Due list unavailable</p>
        <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">{error}</p>
      </div>
    )
  }

  if (topics.length === 0) {
    return (
      <div className="ms-teacher-empty ec-land">
        <span className="ms-teacher-empty__icon" aria-hidden>
          <span className="font-mono text-sm font-bold tracking-wide">DUE</span>
        </span>
        <h2 className="ms-teacher-empty__title">Class due list</h2>
        <p className="ms-teacher-empty__body">
          Nothing due across the roster yet. As students mark and check lessons, topics
          that are cooling off land here.
        </p>
        <Link
          href={`/teacher/classroom/${classroomId}/gaps`}
          className="ec-btn-secondary mt-1 inline-flex min-h-[44px] items-center gap-2"
        >
          <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
            ¶
          </span>
          Mark-type gaps →
        </Link>
      </div>
    )
  }

  const topCodes = topics.slice(0, 3).map((t) => t.topicCode)
  const lead = topics[0]

  return (
    <section className="ms-class-due ec-card ec-card--paper ec-land p-6 sm:p-8">
      <div className="ms-class-due__head">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="ec-ink-stamp ec-ink-stamp--crimson" aria-hidden>
              DUE
            </span>
            <span className="ec-label-tech">Class due list</span>
          </div>
          <h2 className="ms-class-due__title tabular-nums">
            {lead.studentsDue} of {students} due on {lead.name}
          </h2>
          <p className="ms-class-due__sub">
            Topics waiting for a marked question — oldest cooling spots first by how many
            students owe them.
          </p>
        </div>
        <Link
          href={`/teacher/classroom/${classroomId}/gaps`}
          className="ms-teacher-textlink font-mono text-xs font-bold uppercase tracking-[var(--ec-track-label)] text-[var(--ec-brand)]"
        >
          Mark-type gaps →
        </Link>
      </div>

      <ol className="ms-class-due__list" aria-label={`${topics.length} topics due across the class`}>
        {topics.map((t) => (
          <li key={`${t.subjectCode}-${t.topicCode}`} className="ms-class-due__row">
            <div className="ms-class-due__row-main">
              <p className="ms-class-due__name">
                {t.name}
                <span className="ms-class-due__code">
                  {' '}
                  · {t.subjectLabel} · {t.topicCode}
                </span>
              </p>
              <p className="ms-class-due__meta tabular-nums">
                {t.studentsDue} of {t.totalStudents} students · {SOURCE_LABEL[t.source]}
                {t.sampleNames.length > 0 ? ` · e.g. ${t.sampleNames.join(', ')}` : ''}
              </p>
            </div>
            <div className="ms-class-due__bar" aria-hidden>
              <span
                className="ms-class-due__fill"
                style={{ width: `${Math.max(4, Math.min(100, t.duePct))}%` }}
              />
            </div>
            <span className="ms-class-due__pct">{t.duePct}%</span>
          </li>
        ))}
      </ol>

      {topCodes.length > 0 ? (
        <div className="ms-class-due__act">
          <button
            type="button"
            className="ec-btn-secondary inline-flex min-h-[44px] items-center text-sm"
            aria-expanded={showIntervention}
            onClick={() => setShowIntervention(true)}
          >
            Generate intervention on top due topics
          </button>
          {/* Kept mounted so the sheet can slide out; it fetches only when opened. */}
          <InterventionGenerator
            open={showIntervention}
            classroomId={classroomId}
            targetCodes={topCodes}
            onClose={() => setShowIntervention(false)}
          />
        </div>
      ) : null}
    </section>
  )
}
