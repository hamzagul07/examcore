'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  TeacherPageContainer,
  TeacherPageHeader,
} from '@/components/teacher/TeacherPageChrome'
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

      <div className="ms-teacher-inbox-filters mb-6 flex flex-wrap gap-2">
        {(['all', 'pending', 'overridden'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`min-h-[44px] rounded-lg px-4 py-2 text-sm capitalize transition-colors ${
              filter === f
                ? 'bg-[var(--ec-surface-raised)] text-[var(--ec-text-primary)]'
                : 'text-[var(--ec-text-secondary)] hover:text-[var(--ec-text-primary)]'
            }`}
          >
            {f === 'all' ? 'All' : f === 'pending' ? 'Pending review' : 'Overridden'}
          </button>
        ))}
      </div>

      {loading && <p className="text-[var(--ec-text-secondary)]">Loading...</p>}

      {!loading && filtered.length === 0 && (
        <div className="ec-card p-8 text-center text-[var(--ec-text-secondary)]">
          No submissions match this filter.
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
