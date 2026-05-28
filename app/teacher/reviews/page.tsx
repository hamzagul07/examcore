'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ReviewQueueList } from '@/components/teacher/ReviewQueueList'
import { SidebarChat } from '@/components/omni-ai/SidebarChat'
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
    <>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="ec-label-tech mb-3">EXAMINER INK</div>
        <h1 className="mb-8 text-3xl font-bold text-white">Submission inbox</h1>

        <div className="mb-6 flex gap-2">
          {(['all', 'pending', 'overridden'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm capitalize transition-colors ${
                filter === f
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'pending' ? 'Pending review' : 'Overridden'}
            </button>
          ))}
        </div>

        {loading && <p className="text-slate-400">Loading...</p>}

        {!loading && filtered.length === 0 && (
          <div className="ec-card p-8 text-center text-slate-400">
            No submissions match this filter.
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((r) => (
            <Link
              key={r.id}
              href={`/teacher/reviews/${r.id}`}
              className="ec-card ec-card-interactive block p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {r.studentName}
                    </span>
                    {r.overridden && (
                      <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">
                        Overridden
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-400">
                    {r.questionPreview}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-bold text-white">
                    {r.marksEarned}/{r.totalMarks}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <SidebarChat />
    </>
  )
}
