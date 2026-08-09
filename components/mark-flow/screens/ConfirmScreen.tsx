'use client'

import {
  MARK_DURATION_PAPER,
  MARK_DURATION_SINGLE,
} from '@/lib/copy/product-lexicon'
import { StatusMessage } from '@/components/ui/StatusMessage'
import type { MarkFlowDraft } from '../types'

type Props = {
  draft: MarkFlowDraft
  error: string | null
  submitting?: boolean
  onBack: () => void
  onConfirm: () => void
}

/**
 * Honest confirm before spend (R1 / MK-03).
 * Page counts only — never “questions detected” before OCR.
 */
export function ConfirmScreen({
  draft,
  error,
  submitting,
  onBack,
  onConfirm,
}: Props) {
  const isPaper = draft.scope === 'whole_paper'
  const pages = draft.pageCount
  const hasTyped = draft.inputKind === 'typed' && draft.typedAnswer.trim().length > 0

  const inputSummary = hasTyped
    ? 'Typed working ready'
    : pages === 1
      ? '1 page selected'
      : `${pages} pages selected`

  const questionSummary = isPaper
    ? null
    : draft.hasQuestionPhoto && draft.questionText.trim().length >= 10
      ? 'Question photo + typed stem'
      : draft.hasQuestionPhoto
        ? 'Question photo attached'
        : draft.questionText.trim().length >= 10
          ? 'Question stem typed'
          : 'Question context missing'

  const duration = isPaper ? MARK_DURATION_PAPER : MARK_DURATION_SINGLE
  const allowance = isPaper
    ? 'Uses whole-paper marking (counts toward your monthly allowance by question).'
    : 'Uses 1 marked question from your monthly allowance.'

  const catalogHint =
    isPaper && draft.questionNumber
      ? `This paper lists question ${draft.questionNumber} in our catalog — that is structure only, not what we found in your upload.`
      : isPaper
        ? 'We have not OCR’d your pages yet — the count above is what you selected.'
        : null

  return (
    <section className="ms-mark-flow-screen" aria-labelledby="mark-flow-confirm-title">
      <header className="mb-6">
        <p className="ms-overline mb-2">Before we mark</p>
        <h1 id="mark-flow-confirm-title" className="ms-mark-hero-title">
          Check this looks right
        </h1>
        <p className="ms-mark-hero-lead">
          We have not read the pages yet — confirm the upload and cost, then start marking.
        </p>
      </header>

      <dl className="ms-mark-flow-confirm-slip ec-card ec-card--paper space-y-3 border border-[var(--ec-border)] p-5">
        {questionSummary ? (
          <div>
            <dt className="ms-micro">QUESTION</dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--ec-text-primary)]">
              {questionSummary}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="ms-micro">INPUT</dt>
          <dd className="mt-1 text-sm font-semibold text-[var(--ec-text-primary)]">
            {inputSummary}
          </dd>
          {catalogHint ? (
            <dd className="mt-1 text-xs text-[var(--ec-text-secondary)]">{catalogHint}</dd>
          ) : null}
        </div>
        <div>
          <dt className="ms-micro">MODE</dt>
          <dd className="mt-1 text-sm text-[var(--ec-text-primary)]">
            {isPaper ? 'Whole paper' : 'One answer'}
            {isPaper && draft.paperCode ? ` · ${draft.paperCode}` : ''}
            {isPaper && draft.paperSession ? ` · ${draft.paperSession}` : ''}
            {!isPaper && draft.subjectCode ? ` · ${draft.subjectCode}` : ''}
          </dd>
        </div>
        <div>
          <dt className="ms-micro">EXPECTED TIME</dt>
          <dd className="mt-1 text-sm text-[var(--ec-text-primary)]">
            Usually {duration} — a range, not a stopwatch.
          </dd>
        </div>
        <div>
          <dt className="ms-micro">ALLOWANCE</dt>
          <dd className="mt-1 text-sm text-[var(--ec-text-secondary)]">{allowance}</dd>
        </div>
      </dl>

      {error ? (
        <StatusMessage tone="alert" className="mt-4">
          {error}
        </StatusMessage>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="ec-btn-secondary min-h-[44px] justify-center"
          onClick={onBack}
          disabled={submitting}
        >
          Back
        </button>
        <button
          type="button"
          className="ec-btn-primary min-h-[44px] flex-1 justify-center"
          onClick={onConfirm}
          disabled={submitting}
          aria-busy={submitting || undefined}
        >
          {submitting ? 'Starting…' : 'Mark this'}
        </button>
      </div>
    </section>
  )
}
