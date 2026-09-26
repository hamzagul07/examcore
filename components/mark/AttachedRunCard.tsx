'use client'

import Link from 'next/link'
import type { MarkRunOutcome } from '@/lib/marking/mark-run-status-client'

/**
 * What the wait screen shows once the live stream is gone but the run is not.
 *
 * A dropped connection used to say "tap Mark again" while the server kept
 * marking, charged, and emailed — and Mark again started a second charged run
 * (code review 2026-09-25, §1.8). Now the page keeps the run id, polls its
 * status, and only ever offers a fresh submit once the server says the run
 * ended without a result.
 */
export function AttachedRunCard({
  outcome,
  signedIn,
  onMarkAnother,
  headingId,
}: {
  /** Null while the run is still going. */
  outcome: MarkRunOutcome | null
  signedIn: boolean
  /** Back to a clean form once the run has settled. */
  onMarkAnother?: () => void
  /**
   * Set when this card is the only thing under the wait overlay, so the
   * overlay's aria-labelledby ("marking-wait-title") resolves to its headline.
   */
  headingId?: string
}) {
  if (!outcome) {
    return (
      <div className="ec-card p-5" role="status" aria-live="polite">
        <p className="ec-label-tech">STILL MARKING</p>
        <p className="mt-2 text-base font-semibold text-[var(--ec-text-primary)]">
          Still marking — we&rsquo;ll keep going
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
          The connection dropped, but the examiner did not. Your mark is still being
          worked on and nothing extra is charged. We check every few seconds.
        </p>
      </div>
    )
  }

  const scored =
    outcome.ok && outcome.marksEarned != null && outcome.totalMarks
      ? `${outcome.marksEarned}/${outcome.totalMarks}`
      : null

  if (outcome.ok && outcome.attemptId) {
    return (
      <div className="ec-card p-5" role="status" aria-live="polite">
        <p className="ec-label-tech">MARKED</p>
        <h2
          id={headingId}
          className="mt-2 text-base font-semibold text-[var(--ec-text-primary)]"
          tabIndex={-1}
        >
          {scored ? `Your mark is ready — ${scored}` : 'Your mark is ready'}
        </h2>
        {signedIn ? (
          <>
            <p className="mt-1 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
              It finished after this page lost its connection, so the full feedback is on
              your attempt page.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={`/dashboard/attempt/${outcome.attemptId}`}
                className="ec-btn-primary inline-flex w-full justify-center text-sm sm:w-auto"
              >
                See the full feedback
              </Link>
              {onMarkAnother ? (
                <button
                  type="button"
                  onClick={onMarkAnother}
                  className="ec-btn-secondary w-full text-sm sm:w-auto"
                >
                  Mark another question
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
              It finished after this page lost its connection. Guest marks are not saved
              to an account, so the line-by-line feedback could not be recovered here —
              sign in before your next mark and it will always be waiting for you.
            </p>
            {onMarkAnother ? (
              <button
                type="button"
                onClick={onMarkAnother}
                className="ec-btn-secondary mt-4 w-full text-sm sm:w-auto"
              >
                Back to the desk
              </button>
            ) : null}
          </>
        )}
      </div>
    )
  }

  return null
}
