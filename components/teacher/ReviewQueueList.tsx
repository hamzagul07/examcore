'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronRight, Clock } from 'lucide-react'

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
      .catch(() => setLoading(false))
  }, [classroomId, limit])

  return (
    <div className="ec-card p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="ec-label-tech mb-2">REVIEW QUEUE</div>
          <h2 className="text-2xl font-bold text-white">Recent submissions</h2>
        </div>
        <Link
          href="/teacher/reviews"
          className="text-sm text-emerald-400 hover:text-emerald-300"
        >
          View all →
        </Link>
      </div>

      {loading && (
        <p className="text-slate-400">Loading submissions...</p>
      )}

      {!loading && reviews.length === 0 && (
        <p className="text-slate-400">
          No AI-marked submissions yet. Students need to complete marked attempts
          with full marking data.
        </p>
      )}

      <div className="space-y-3">
        {reviews.map((r) => (
          <Link
            key={r.id}
            href={`/teacher/reviews/${r.id}`}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-emerald-500/20 hover:bg-white/[0.04]"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{r.studentName}</span>
                {r.overridden && (
                  <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">
                    Overridden
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-slate-400">
                {r.questionPreview}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                <span>
                  AI score: {r.marksEarned}/{r.totalMarks}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
          </Link>
        ))}
      </div>
    </div>
  )
}
