'use client'

import { MARK_DURATION_SINGLE } from '@/lib/copy/product-lexicon'

/**
 * Immediate acknowledgement while the cinematic wait chunk loads.
 * Never render a blank fixed overlay after the student spends a credit (MK-02).
 */
export function MarkingWaitFallback() {
  return (
    <article className="ms-mark-wait" aria-busy="true" aria-live="polite">
      <div className="ms-mark-wait__cap">
        <p className="ms-mark-wait__label">Marking desk</p>
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          INK
        </span>
      </div>
      <div
        className="mt-4 h-2 w-full overflow-hidden rounded border border-[var(--ec-border)] bg-[var(--ec-surface-raised)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={8}
        aria-label="Marking progress"
      >
        <div
          className="h-full w-[8%] bg-[var(--ec-brand)]"
          style={{ boxShadow: 'var(--ec-shadow-hard, 2px 2px 0 rgba(0,0,0,0.08))' }}
        />
      </div>
      <p className="ms-mark-wait__eta mt-3">
        Starting mark — usually {MARK_DURATION_SINGLE}
      </p>
      <h2 id="marking-wait-title" className="ms-mark-wait__headline mt-7">
        Received — reading your work…
      </h2>
      <span className="ms-mark-wait__note" aria-hidden>
        marks land on the line — hold on
      </span>
    </article>
  )
}
