import Link from 'next/link'
import { FileText, NotebookPen, ChevronRight } from 'lucide-react'
import { SyllabusTopicBadgeList } from '@/components/SyllabusTopicBadge'
import type { SyllabusCode } from '@/lib/syllabus'

export type AttemptListRow = {
  id: string
  marks_earned: number
  total_marks: number
  created_at: string
  source_type?: string | null
  question_text?: string | null
  syllabus_tags?: SyllabusCode[] | null
  mark_schemes?:
    | { question_number?: string | null; paper_code?: string | null; paper_session?: string | null }
    | { question_number?: string | null; paper_code?: string | null; paper_session?: string | null }[]
    | null
}

function scheme(row: AttemptListRow) {
  const ms = row.mark_schemes
  if (!ms) return null
  return Array.isArray(ms) ? ms[0] ?? null : ms
}

/**
 * Read-only list of marked attempts, one row per attempt, linking to the
 * existing attempt detail page. Mirrors the home dashboard's recent-attempts
 * row so the "All attempts" tab feels familiar.
 */
export function AttemptsList({ attempts }: { attempts: AttemptListRow[] }) {
  if (attempts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--ec-border)] bg-[var(--ec-surface)] p-8 text-center text-sm text-[var(--ec-text-secondary)]">
        No attempts for this subject yet. Mark a question and it will show up here.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {attempts.map((attempt) => {
        const percentage =
          attempt.total_marks > 0
            ? Math.round((attempt.marks_earned / attempt.total_marks) * 100)
            : 0
        const scoreColor =
          percentage === 100
            ? 'ec-score-high'
            : percentage >= 50
            ? 'ec-score-mid'
            : 'ec-score-low'

        const ms = scheme(attempt)
        const isPastPaper = attempt.source_type === 'past_paper' && ms
        const questionLabel = isPastPaper
          ? `Q${ms?.question_number} — ${ms?.paper_code} ${ms?.paper_session}`
          : `Custom: ${(attempt.question_text || '').substring(0, 60)}${
              (attempt.question_text || '').length > 60 ? '…' : ''
            }`
        const dateStr = new Date(attempt.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })

        return (
          <Link
            key={attempt.id}
            href={`/dashboard/attempt/${attempt.id}`}
            className="ec-card ec-card-interactive group block p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                    isPastPaper ? 'ec-tint-info-icon-wrap' : 'ec-tint-accent-icon-wrap'
                  }`}
                >
                  {isPastPaper ? (
                    <FileText className="h-5 w-5" />
                  ) : (
                    <NotebookPen className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[var(--ec-text-primary)]">
                    {questionLabel}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-[var(--ec-text-secondary)]">
                    {dateStr}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <div className={`ec-stat-figure text-3xl ${scoreColor}`}>
                    {attempt.marks_earned}
                    <span className="text-[var(--ec-text-secondary)]">/{attempt.total_marks}</span>
                  </div>
                  <div className="font-mono text-xs font-medium text-[var(--ec-text-secondary)]">
                    {percentage}%
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[var(--ec-text-secondary)] transition-all duration-200 group-hover:translate-x-1 group-hover:text-[var(--ec-brand)]" />
              </div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full border border-[var(--ec-border)] bg-[var(--ec-surface)]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentage === 100
                    ? 'ec-score-bar-high'
                    : percentage >= 50
                    ? 'ec-score-bar-mid'
                    : 'ec-score-bar-low'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            {attempt.syllabus_tags && attempt.syllabus_tags.length > 0 && (
              <div className="mt-3">
                <SyllabusTopicBadgeList
                  codes={attempt.syllabus_tags}
                  subjectCode={ms?.paper_code?.split('/')[0] || undefined}
                  max={2}
                  size="sm"
                />
              </div>
            )}
          </Link>
        )
      })}
    </div>
  )
}
