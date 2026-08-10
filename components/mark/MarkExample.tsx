'use client'

/**
 * "See it work before you upload."
 *
 * The measured drop-off on /mark was not impatience with marking — it was
 * people never starting one. Most of the users who opened the page spent about
 * a minute on it and left without uploading a thing, which means they bounced
 * off an empty uploader rather than off the wait. Both surfaces here exist to
 * answer "what do I actually get back?" before asking for any commitment.
 */

export type MarkExampleBoardKind = 'cambridge' | 'ib' | 'other'

function sampleLead(board: MarkExampleBoardKind): string {
  if (board === 'ib') {
    return 'A Maths AA answer, marked with IB method / accuracy / reasoning notation. Yours will look like this, against your own paper.'
  }
  if (board === 'other') {
    return 'A Cambridge A-Level Maths example — same mark-by-mark format you get on your board. Yours will look like this, against your own paper.'
  }
  return 'A real A-Level Maths answer, marked against the official scheme. Yours will look like this, against your own paper.'
}

/** Shown above the upload form while there is nothing to display yet. */
export function MarkExampleInvite({
  onOpen,
  className = '',
}: {
  onOpen: () => void
  className?: string
}) {
  return (
    <aside
      className={`ms-mark-example-slip ${className}`.trim()}
      aria-label="See a marked example before uploading"
    >
      <div className="ms-mark-example-slip__body">
        <span className="ec-ink-stamp" aria-hidden>
          eg
        </span>
        <div className="ms-mark-example-slip__copy">
          <p className="ms-mark-example-slip__title">Not sure what you get back?</p>
          <p className="ms-mark-example-slip__lead">
            Look at a real marked answer first — every mark, why it was given,
            and the one that got away. No upload, nothing to set up.
          </p>
          <span className="ms-mark-example-slip__note" aria-hidden>
            see the ink before you spend a photo
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="ec-btn-secondary ms-mark-example-slip__cta inline-flex min-h-[44px] items-center justify-center gap-1.5 text-sm font-semibold"
      >
        See a marked example
        <span className="font-mono text-[11px] font-bold" aria-hidden>
          -&gt;
        </span>
      </button>
    </aside>
  )
}

/**
 * Shown above the example result. Labelling this unmistakably as a sample is
 * not optional — a marked answer the user did not submit would otherwise read
 * as their own score.
 */
export function MarkExampleBanner({
  onDismiss,
  board = 'cambridge',
}: {
  onDismiss: () => void
  board?: MarkExampleBoardKind
}) {
  return (
    <aside
      className="ms-mark-example-slip ms-mark-example-slip--live"
      aria-label="This is a sample mark, not your work"
    >
      <div className="ms-mark-example-slip__body">
        <span className="ec-ink-stamp ec-ink-stamp--crimson" aria-hidden>
          eg
        </span>
        <div className="ms-mark-example-slip__copy">
          <p className="ms-mark-example-slip__title">
            This is an example — not your work
          </p>
          <p className="ms-mark-example-slip__lead">{sampleLead(board)}</p>
          <span className="ms-mark-example-slip__note" aria-hidden>
            sample slip — close it when you&apos;re ready
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="ec-btn-primary ms-mark-example-slip__cta inline-flex min-h-[44px] items-center justify-center gap-1.5 text-sm font-semibold"
      >
        Mark my own answer
        <span className="font-mono text-[11px] font-bold" aria-hidden>
          -&gt;
        </span>
      </button>
    </aside>
  )
}

/** Compact dismissal shown under the example result. */
export function MarkExampleFooter({ onDismiss }: { onDismiss: () => void }) {
  return (
    <button
      type="button"
      onClick={onDismiss}
      className="ec-btn-ghost inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wide"
    >
      Close example and upload my own -&gt;
    </button>
  )
}
