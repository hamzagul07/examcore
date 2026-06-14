'use client'

import Link from 'next/link'
import { ChevronRight, Target, BarChart3 } from 'lucide-react'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import type { MarkingResultData } from '@/components/MarkingResultView'

type Props = {
  result: MarkingResultData
  onMarkAnother: () => void
  onMarkNewQuestion: () => void
}

export function PostMarkNextSteps({
  result,
  onMarkAnother,
  onMarkNewQuestion,
}: Props) {
  const weakTopics = result.ai_marking?.weak_topics ?? []
  const studyNext = result.ai_marking?.what_to_study_next?.trim()

  return (
    <div className="ms-post-mark-next space-y-4 pt-2">
      {(weakTopics.length > 0 || studyNext) && (
        <div className="ec-card group flex flex-col gap-4 border-[var(--ec-brand)]/25 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Target
              className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ec-brand)]"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-[var(--ec-text-primary)]">
                {weakTopics.length > 0
                  ? `Focus next: ${weakTopics.slice(0, 2).join(', ')}`
                  : 'Keep the momentum going'}
              </p>
              {studyNext && (
                <div className="mt-0.5 text-sm text-[var(--ec-text-secondary)]">
                  <RichTextRenderer text={studyNext} />
                </div>
              )}
            </div>
          </div>
          <Link
            href="/dashboard/progress"
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 self-start text-sm font-semibold text-[var(--ec-brand)] sm:self-auto"
          >
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            View progress
            <ChevronRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onMarkAnother}
          className="ec-btn-secondary min-h-[48px] w-full justify-center text-base"
        >
          <span className="sm:hidden">Same question again</span>
          <span className="hidden sm:inline">Mark another attempt at this question</span>
        </button>
        <button
          type="button"
          onClick={onMarkNewQuestion}
          className="ec-btn-primary min-h-[48px] w-full justify-center text-base"
        >
          <span className="sm:hidden">New question</span>
          <span className="hidden sm:inline">Mark a new question</span>
        </button>
      </div>
    </div>
  )
}
