'use client'

import Link from 'next/link'
import type { Recommendation } from '@/lib/insights/types'
import { useNotebookAnimate } from './notebook/useNotebookAnimate'
import {
  HandArrow,
  HandBullet,
  HandCheckmark,
  HandDivider,
  HandStar,
  HandUnderline,
} from './notebook/marks'

export type NotebookAttempt = {
  id: string
  label: string
  marks_earned: number
  total_marks: number
}

type Props = {
  monthlyAttempts: number
  streak: number
  bestSubjectLabel: string | null
  recentAttempts: NotebookAttempt[]
  recommendations: Recommendation[]
  isEmpty: boolean
}

const handwriting = 'font-[family-name:var(--ec-font-handwriting)]'

export function StudyNotebook({
  monthlyAttempts,
  streak,
  bestSubjectLabel,
  recentAttempts,
  recommendations,
  isEmpty,
}: Props) {
  const { animate, ready } = useNotebookAnimate()
  const ink = 'var(--ec-notebook-ink)'
  const markKey = ready ? (animate ? 'draw' : 'static') : 'pending'

  if (isEmpty) {
    return (
      <section className="ms-study-notebook ec-notebook mx-auto mb-8 min-w-0 max-w-2xl p-5 sm:p-8">
        <header className="mb-4">
          <h2 className={`${handwriting} text-2xl text-[var(--ec-notebook-ink)] sm:text-3xl`}>
            <span aria-hidden className="mr-1.5">
              ✎
            </span>
            Your study notebook
          </h2>
          <HandUnderline key={markKey} animate={animate} delay={0} color={ink} />
        </header>
        <div className="flex flex-wrap items-center gap-3 py-2">
          <p className="text-sm text-[var(--ec-text-secondary)]">
            Your notebook is empty. Mark a question to start.
          </p>
          <Link
            href="/mark"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ec-notebook-ink)]"
          >
            <HandArrow key={markKey} direction="right" animate={animate} delay={0.2} size={18} color={ink} />
            <span className={`${handwriting} text-lg underline underline-offset-2`}>Mark a question</span>
          </Link>
        </div>
      </section>
    )
  }

  const previewAttempts = recentAttempts.slice(0, 3)
  const previewRecs = recommendations.slice(0, 3)

  return (
    <section className="ms-study-notebook ec-notebook mx-auto mb-8 min-w-0 max-w-2xl p-5 sm:p-8">
      <header className="mb-6">
        <h2 className={`${handwriting} text-2xl text-[var(--ec-notebook-ink)] sm:text-3xl`}>
          <span aria-hidden className="mr-1.5">
            ✎
          </span>
          Your study notebook
        </h2>
        <HandUnderline key={markKey} animate={animate} delay={0} color={ink} />
      </header>

      <div className="space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ec-notebook-pencil)]">
          This month
        </p>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-[var(--ec-text-primary)]">
          <span className={`${handwriting} ec-notebook-stat text-[var(--ec-notebook-ink)]`}>
            {monthlyAttempts}
          </span>
          <span>questions marked</span>
          <HandCheckmark animate={animate} delay={0.1} size={14} color={ink} />
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-[var(--ec-text-primary)]">
          <span className={`${handwriting} ec-notebook-stat text-[var(--ec-notebook-ink)]`}>{streak}</span>
          <span>day streak</span>
          <HandArrow direction="up" animate={animate} delay={0.2} size={14} color={ink} />
        </div>

        {bestSubjectLabel && (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-[var(--ec-text-primary)]">
            <span>Best subject:</span>
            <span className={`${handwriting} text-lg text-[var(--ec-notebook-ink)]`}>
              {bestSubjectLabel}
            </span>
            <HandStar animate={animate} delay={0.3} size={14} color={ink} />
          </div>
        )}
      </div>

      <div className="my-5">
        <HandDivider animate={animate} delay={0.4} color={ink} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-[var(--ec-text-primary)]">Recent work</h3>
        <ul className="space-y-2.5">
          {previewAttempts.map((attempt, i) => (
            <li key={attempt.id}>
              <Link
                href={`/dashboard/attempt/${attempt.id}`}
                className="group flex items-start gap-2.5 text-sm text-[var(--ec-text-primary)] hover:text-[var(--ec-notebook-ink)]"
              >
                <HandCheckmark
                  animate={animate}
                  delay={0.5 + i * 0.08}
                  size={15}
                  color={ink}
                  className="mt-0.5"
                />
                <span className="min-w-0 ec-break-anywhere">
                  {attempt.label},{' '}
                  <span className={`${handwriting} text-base text-[var(--ec-notebook-ink)]`}>
                    {attempt.marks_earned}/{attempt.total_marks}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/dashboard/progress?tab=attempts"
          className={`${handwriting} mt-4 inline-flex items-center gap-1.5 text-lg text-[var(--ec-notebook-ink)] underline underline-offset-4`}
        >
          see all attempts
        </Link>
      </div>

      {previewRecs.length > 0 && (
        <>
          <div className="my-5">
            <HandDivider animate={animate} delay={0.8} color={ink} />
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-[var(--ec-text-primary)]">
              What to study next
            </h3>
            <ul className="space-y-2">
              {previewRecs.map((rec, i) => (
                <li key={`${rec.paperCode}-${rec.questionNumber}`} className="flex items-start gap-2.5">
                  <HandBullet
                    animate={animate}
                    delay={0.9 + i * 0.06}
                    size={7}
                    color={ink}
                    className="mt-1.5"
                  />
                  <span className="min-w-0 text-sm text-[var(--ec-text-secondary)] ec-break-anywhere">
                    {rec.targetLabel}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}
