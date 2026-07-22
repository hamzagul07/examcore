'use client'

import { ArrowRight, Eye, X } from 'lucide-react'

/**
 * "See it work before you upload."
 *
 * The measured drop-off on /mark was not impatience with marking — it was
 * people never starting one. Most of the users who opened the page spent about
 * a minute on it and left without uploading a thing, which means they bounced
 * off an empty uploader rather than off the wait. Both surfaces here exist to
 * answer "what do I actually get back?" before asking for any commitment.
 */

/** Shown above the upload form while there is nothing to display yet. */
export function MarkExampleInvite({
  onOpen,
  className = '',
}: {
  onOpen: () => void
  className?: string
}) {
  return (
    <div
      className={`ec-card flex flex-col gap-3 border-[var(--ec-brand)]/25 p-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex items-start gap-3">
        <Eye
          className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ec-brand)]"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold text-[var(--ec-text-primary)]">
            Not sure what you get back?
          </p>
          <p className="mt-0.5 text-sm text-[var(--ec-text-secondary)]">
            Look at a real marked answer first — every mark, why it was given,
            and the one that got away. No upload, nothing to set up.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="ec-btn-secondary inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 self-start whitespace-nowrap text-sm font-semibold sm:self-auto"
      >
        See a marked example
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

/**
 * Shown above the example result. Labelling this unmistakably as a sample is
 * not optional — a marked answer the user did not submit would otherwise read
 * as their own score.
 */
export function MarkExampleBanner({
  onDismiss,
}: {
  onDismiss: () => void
}) {
  return (
    <div className="ec-card flex flex-col gap-3 border-[var(--ec-brand)]/40 bg-[var(--ec-brand)]/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Eye
          className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ec-brand)]"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold text-[var(--ec-text-primary)]">
            This is an example — not your work
          </p>
          <p className="mt-0.5 text-sm text-[var(--ec-text-secondary)]">
            A real A-Level Maths answer, marked against the official scheme.
            Yours will look like this, against your own paper.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="ec-btn-primary inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 self-start whitespace-nowrap text-sm font-semibold sm:self-auto"
      >
        Mark my own answer
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

/** Compact dismissal shown under the example result. */
export function MarkExampleFooter({ onDismiss }: { onDismiss: () => void }) {
  return (
    <button
      type="button"
      onClick={onDismiss}
      className="ec-btn-ghost inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 text-sm font-semibold"
    >
      <X className="h-4 w-4" aria-hidden="true" />
      Close example and upload my own
    </button>
  )
}
