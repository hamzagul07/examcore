'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronRight, Clock } from 'lucide-react'
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

export function ReviewQueueList({ classroomId, limit = 5 }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const url = classroomId
      ? `/api/teacher/reviews?classroom_id=${classroomId}`
      : '/api/teacher/reviews'
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setReviews((d.reviews || []).slice(0, limit))
        setLoading(false)
      })
      .catch((err) => {
        console.error('ReviewQueueList: failed to load reviews', err)
        setError('Could not load submissions. Please try again.')
        setLoading(false)
      })
  }, [classroomId, limit])

  return (
    <div className="ms-teacher-review ec-card p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="ec-label-tech mb-2">REVIEW QUEUE</div>
          <h2 className="text-xl font-bold text-[var(--ec-text-primary)] sm:text-2xl">Recent submissions</h2>
        </div>
        <Link
          href="/teacher/reviews"
          className="inline-flex min-h-[44px] items-center text-sm ec-link"
        >
          View all →
        </Link>
      </div>

      {loading && (
        <div className="space-y-3" aria-hidden>
          <SkeletonBlock className="h-[88px] w-full rounded-xl" />
          <SkeletonBlock className="h-[88px] w-full rounded-xl" />
        </div>
      )}

      {!loading && error && (
        <p className="text-[var(--ec-danger,#b91c1c)]">{error}</p>
      )}

      {!loading && !error && reviews.length === 0 && (
        <p className="text-[var(--ec-text-secondary)]">
          No AI-marked submissions yet. Students need to complete marked attempts
          with full marking data.
        </p>
      )}

      <div className="space-y-3">
        {reviews.map((r) => (
          <Link
            key={r.id}
            href={`/teacher/reviews/${r.id}`}
            className="flex min-h-[56px] items-center justify-between rounded-xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-4 transition-colors ec-hover-brand-border-mild hover:bg-[var(--ec-surface-raised)]"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--ec-text-primary)]">{r.studentName}</span>
                {r.overridden && (
                  <span className="ec-tint-accent-chip rounded-full px-2 py-0.5 text-xs">
                    Overridden
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-[var(--ec-text-secondary)]">
                {r.questionPreview}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-[var(--ec-text-secondary)]">
                <span>
                  AI score: {r.marksEarned}/{r.totalMarks}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[var(--ec-text-secondary)]" />
          </Link>
        ))}
      </div>
    </div>
  )
}
