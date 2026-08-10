'use client'

import Link from 'next/link'
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
        <aside className="ms-mark-example-slip" aria-label="What to study next">
          <div className="ms-mark-example-slip__body">
            <span className="ec-ink-stamp" aria-hidden>
              Q
            </span>
            <div className="ms-mark-example-slip__copy">
              <p className="ms-mark-example-slip__title">
                {weakTopics.length > 0
                  ? `Focus next: ${weakTopics.slice(0, 2).join(', ')}`
                  : 'Keep the momentum going'}
              </p>
              {studyNext ? (
                <div className="ms-mark-example-slip__lead">
                  <RichTextRenderer text={studyNext} />
                </div>
              ) : null}
              <span className="ms-mark-example-slip__note" aria-hidden>
                one weak topic beats a vague redo
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/review"
            className="ms-mark-example-slip__cta inline-flex min-h-[44px] items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wide text-[var(--ec-brand)]"
          >
            See what&apos;s due -&gt;
          </Link>
        </aside>
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
          className="ec-btn-primary inline-flex min-h-[48px] w-full items-center justify-center gap-2 text-base"
        >
          <span className="sm:hidden">New question</span>
          <span className="hidden sm:inline">Mark a new question</span>
          <span className="font-mono text-[11px] font-bold" aria-hidden>
            -&gt;
          </span>
        </button>
      </div>
    </div>
  )
}
