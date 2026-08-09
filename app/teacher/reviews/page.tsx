'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { MarkSnippet } from '@/components/mark/MarkSnippet'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { SkeletonBlock } from '@/components/ui/PageSkeleton'
import { useSetAIContext } from '@/lib/omni-ai/context'

type Filter = 'all' | 'pending' | 'overridden'

interface Review {
  id: string
  studentName: string
  questionPreview: string
  marksEarned: number
  totalMarks: number
  createdAt: string
  overridden: boolean
}

type InboxState =
  | { status: 'loading' }
  | { status: 'ready'; data: Review[] }
  | { status: 'empty' }
  | { status: 'error'; message: string }

export default function ReviewsPage() {
  const [state, setState] = useState<InboxState>({ status: 'loading' })
  const [filter, setFilter] = useState<Filter>('all')

  useSetAIContext({ type: 'teacher_dashboard', data: {} }, [])

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const r = await fetch('/api/teacher/reviews', { cache: 'no-store' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setState({
          status: 'error',
          message: d.error || 'Could not load the review inbox.',
        })
        return
      }
      const list = (d.reviews || []) as Review[]
      setState(list.length === 0 ? { status: 'empty' } : { status: 'ready', data: list })
    } catch {
      setState({ status: 'error', message: 'Could not reach the server.' })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const reviews = state.status === 'ready' ? state.data : []
  const filtered = reviews.filter((r) => {
    if (filter === 'pending') return !r.overridden
    if (filter === 'overridden') return r.overridden
    return true
  })

  return (
    <TeacherPageContainer className="ms-teacher-inbox max-w-4xl">
      <header className="ms-teacher-desk-head">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <p className="ec-eyebrow mb-0">Examiner ink</p>
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              RV
            </span>
          </div>
          <h1 className="text-headline">Submission inbox</h1>
          <span className="ms-teacher-desk-head__note" aria-hidden>
            override when the AI misses the scheme
          </span>
        </div>
      </header>

      {state.status === 'error' ? (
        <div className="ms-teacher-error mb-6" role="alert">
          <p className="font-semibold text-[var(--ec-text-primary)]">Couldn’t load inbox</p>
          <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">{state.message}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="ec-btn-primary mt-4 inline-flex min-h-[44px] items-center"
          >
            Try again
          </button>
        </div>
      ) : null}

      <div
        className="ms-teacher-start__choices mb-6"
        role="tablist"
        aria-label="Filter submissions"
      >
        {(['all', 'pending', 'overridden'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className="ms-teacher-start__choice"
          >
            {f === 'all' ? 'All' : f === 'pending' ? 'Pending review' : 'Overridden'}
          </button>
        ))}
      </div>

      {state.status === 'loading' ? (
        <div className="ms-teacher-class-list" aria-busy aria-label="Loading submissions">
          <SkeletonBlock className="h-[72px] w-full" />
          <SkeletonBlock className="h-[72px] w-full" />
          <SkeletonBlock className="h-[72px] w-full" />
        </div>
      ) : null}

      {(state.status === 'empty' ||
        (state.status === 'ready' && filtered.length === 0)) && (
        <div className="ms-teacher-empty">
          <span className="ms-teacher-empty__icon" aria-hidden>
            <span className="font-mono text-sm font-bold tracking-wide">IN</span>
          </span>
          <h2 className="ms-teacher-empty__title">
            {state.status === 'empty' || filter === 'all'
              ? 'No submissions yet'
              : 'Nothing in this filter'}
          </h2>
          <p className="ms-teacher-empty__body">
            {state.status === 'empty' || filter === 'all'
              ? 'When your students mark work in a classroom, their submissions land here for review.'
              : 'No submissions match this filter. Try another one.'}
          </p>
        </div>
      )}

      <ul className="ms-teacher-class-list">
        {filtered.map((r) => (
          <li key={r.id}>
            <Link href={`/teacher/reviews/${r.id}`} className="ms-teacher-class-slip">
              <span className="ms-teacher-class-slip__stamp" aria-hidden>
                {r.overridden ? 'OV' : 'RV'}
              </span>
              <span>
                <h2 className="ms-teacher-class-slip__name">{r.studentName}</h2>
                <p className="ms-teacher-class-slip__meta">
                  <MarkSnippet text={r.questionPreview} />
                  {r.overridden ? ' · overridden' : ''}
                </p>
              </span>
              <span className="ms-teacher-class-slip__go">
                {r.marksEarned}/{r.totalMarks}
                <span className="mt-1 block text-[10px] font-normal tracking-normal text-[var(--ec-text-secondary)]">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </TeacherPageContainer>
  )
}
