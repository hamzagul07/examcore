'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { MarkSnippet } from '@/components/mark/MarkSnippet'
import { SkeletonBlock } from '@/components/ui/PageSkeleton'

interface Review {
  id: string
  studentName: string
  questionPreview: string
  marksEarned: number
  totalMarks: number
  createdAt: string
  overridden: boolean
}

interface Props {
  classroomId?: string
  limit?: number
}

type QueueState =
  | { status: 'loading' }
  | { status: 'ready'; data: Review[] }
  | { status: 'empty' }
  | { status: 'error'; message: string }

export function ReviewQueueList({ classroomId, limit = 5 }: Props) {
  const [state, setState] = useState<QueueState>({ status: 'loading' })

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    const url = classroomId
      ? `/api/teacher/reviews?classroom_id=${classroomId}`
      : '/api/teacher/reviews'

    try {
      const r = await fetch(url, { cache: 'no-store' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setState({
          status: 'error',
          message: d.error || 'Could not load submissions. Please try again.',
        })
        return
      }
      const list = ((d.reviews || []) as Review[]).slice(0, limit)
      setState(list.length === 0 ? { status: 'empty' } : { status: 'ready', data: list })
    } catch {
      setState({
        status: 'error',
        message: 'Could not load submissions. Please try again.',
      })
    }
  }, [classroomId, limit])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="ms-teacher-roster" aria-labelledby="review-queue-heading">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="ec-label-tech mb-0">Review queue</span>
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              RV
            </span>
          </div>
          <h2 id="review-queue-heading" className="text-xl font-bold text-[var(--ec-text-primary)] sm:text-2xl">
            Recent submissions
          </h2>
        </div>
        <Link
          href="/teacher/reviews"
          className="inline-flex min-h-[44px] items-center font-mono text-[11px] font-bold tracking-wide ec-text-brand"
        >
          View all -&gt;
        </Link>
      </div>

      {state.status === 'loading' ? (
        <div className="ms-teacher-class-list" aria-busy aria-label="Loading submissions">
          <SkeletonBlock className="h-[72px] w-full" />
          <SkeletonBlock className="h-[72px] w-full" />
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="ms-teacher-error" role="alert">
          <p className="font-semibold text-[var(--ec-text-primary)]">Couldn’t load submissions</p>
          <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">{state.message}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="ec-btn-secondary mt-4 inline-flex min-h-[44px] items-center"
          >
            Try again
          </button>
        </div>
      ) : null}

      {state.status === 'empty' ? (
        <div className="ms-teacher-empty">
          <span className="ms-teacher-empty__icon" aria-hidden>
            <span className="font-mono text-sm font-bold tracking-wide">IN</span>
          </span>
          <p className="ms-teacher-empty__title">No submissions yet</p>
          <p className="ms-teacher-empty__body">
            Students need to complete marked attempts with full marking data before they appear
            here.
          </p>
        </div>
      ) : null}

      {state.status === 'ready' ? (
        <ul className="ms-teacher-roster__list">
          {state.data.map((r) => (
            <li key={r.id}>
              <Link href={`/teacher/reviews/${r.id}`} className="ms-teacher-roster__row">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[var(--ec-text-primary)]">{r.studentName}</span>
                    {r.overridden ? (
                      <span className="ec-tint-accent-chip rounded px-2 py-0.5 text-xs">
                        Overridden
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block line-clamp-2 text-sm text-[var(--ec-text-secondary)]">
                    <MarkSnippet text={r.questionPreview} />
                  </span>
                  <span className="mt-1 block text-xs text-[var(--ec-text-secondary)]">
                    AI score: {r.marksEarned}/{r.totalMarks}
                    {' · '}
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </span>
                <span className="font-mono text-[11px] font-bold text-[var(--ec-brand)]" aria-hidden>
                  -&gt;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
