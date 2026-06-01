'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { FileText, NotebookPen, ChevronRight } from 'lucide-react'
import { LoadingLink } from '@/components/ui/LoadingLink'

export type RecentAttempt = {
  id: string
  marks_earned: number
  total_marks: number
  source_type: string
  question_text: string | null
  created_at: string
  label: string
  dateStr: string
  percentage: number
}

type Props = {
  attempts: RecentAttempt[]
}

export function RecentAttempts({ attempts }: Props) {
  if (attempts.length === 0) return null

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-title">Recent activity</h2>
        <Link
          href="/dashboard/progress?tab=attempts"
          className="shrink-0 text-sm font-semibold text-[var(--ec-brand)]"
        >
          View all
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {attempts.map((attempt) => {
          const scoreColor =
            attempt.percentage === 100
              ? 'ec-score-high'
              : attempt.percentage >= 50
                ? 'ec-score-mid'
                : 'ec-score-low'

          return (
            <motion.div
              key={attempt.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <LoadingLink
                href={`/dashboard/attempt/${attempt.id}`}
                variant="card"
                className="ec-card ec-card-interactive relative block p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                        attempt.source_type === 'past_paper'
                          ? 'ec-tint-info-icon-wrap'
                          : 'ec-tint-accent-icon-wrap'
                      }`}
                    >
                      {attempt.source_type === 'past_paper' ? (
                        <FileText className="h-4 w-4" />
                      ) : (
                        <NotebookPen className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--ec-text-primary)]">
                        {attempt.label}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-[var(--ec-text-secondary)]">
                        {attempt.dateStr}
                      </p>
                    </div>
                  </div>
                  <div className={`shrink-0 text-lg font-bold ${scoreColor}`}>
                    {attempt.percentage}%
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end">
                  <span className="text-xs font-medium text-[var(--ec-brand)]">
                    View <ChevronRight className="inline h-3 w-3" />
                  </span>
                </div>
              </LoadingLink>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
