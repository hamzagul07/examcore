'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Inbox } from 'lucide-react'
import {
  TeacherPageContainer,
  TeacherPageHeader,
} from '@/components/teacher/TeacherPageChrome'
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

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)

  useSetAIContext({ type: 'teacher_dashboard', data: {} }, [])

  useEffect(() => {
    fetch('/api/teacher/reviews')
      .then((r) => r.json())
      .then((d) => {
        setReviews(d.reviews || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = reviews.filter((r) => {
    if (filter === 'pending') return !r.overridden
    if (filter === 'overridden') return r.overridden
    return true
  })

  return (
    <TeacherPageContainer className="ms-teacher-inbox max-w-4xl">
      <TeacherPageHeader label="EXAMINER INK" title="Submission inbox" />

      <div className="ms-teacher-inbox-filters mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter submissions">
        {(['all', 'pending', 'overridden'] as Filter[]).map((f) => {
          const active = filter === f
          return (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f)}
              className="min-h-[44px] rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
              style={
                active
                  ? {
                      borderColor: 'var(--ec-brand)',
                      background: 'var(--ec-brand-muted)',
                      color: 'var(--ec-brand)',
                    }
                  : {
                      borderColor: 'var(--ec-border)',
                      background: 'var(--ec-surface)',
                      color: 'var(--ec-text-secondary)',
                    }
              }
            >
              {f === 'all' ? 'All' : f === 'pending' ? 'Pending review' : 'Overridden'}
            </button>
          )
        })}
      </div>

      {loading && (
        <div className="space-y-3" aria-hidden>
          <SkeletonBlock className="h-[88px] w-full" />
          <SkeletonBlock className="h-[88px] w-full" />
          <SkeletonBlock className="h-[88px] w-full" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="ec-card relative overflow-hidden p-10 text-center">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-[90px]"
            style={{ background: 'color-mix(in srgb, var(--ec-brand) 14%, transparent)' }}
            aria-hidden
          />
          <div className="relative">
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: 'var(--ec-brand-muted)', color: 'var(--ec-brand)' }}
            >
              <Inbox className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="text-h3 text-[var(--ec-text-primary)]">
              {filter === 'all' ? 'No submissions yet' : 'Nothing here'}
            </h2>
            <p className="text-body mx-auto mt-2 max-w-sm text-[var(--ec-text-secondary)]">
              {filter === 'all'
                ? 'When your students mark work in a classroom, their submissions land here for review.'
                : 'No submissions match this filter. Try another one.'}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((r) => (
          <Link
            key={r.id}
            href={`/teacher/reviews/${r.id}`}
            className="ec-card ec-card-interactive block min-h-[72px] p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--ec-text-primary)]">
                    {r.studentName}
                  </span>
                  {r.overridden && (
                    <span className="ec-tint-accent-chip rounded-full px-2 py-0.5 text-xs">
                      Overridden
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-[var(--ec-text-secondary)]">
                  {r.questionPreview}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-bold text-[var(--ec-text-primary)]">
                  {r.marksEarned}/{r.totalMarks}
                </div>
                <div className="text-xs text-[var(--ec-text-secondary)]">
                  {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </TeacherPageContainer>
  )
}
