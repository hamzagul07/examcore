'use client'

import { Sheet } from '@/components/ui/Sheet'

type CelebrationModalProps = {
  open: boolean
  title: string
  message: string
  onDismiss: () => void
  /** Mono stamp on the paper slip — default M1 (first mark energy). */
  stamp?: string
}

/** Subtle once-per-audience acknowledgment — ink stamp settle, no confetti. */
export function CelebrationModal({
  open,
  title,
  message,
  onDismiss,
  stamp = 'M1',
}: CelebrationModalProps) {
  return (
    <Sheet open={open} onClose={onDismiss} title={title}>
      <div className="ec-celebrate pt-2 text-center">
        <div className="ec-celebrate__slip" aria-hidden>
          <span className="ec-celebrate__stamp">{stamp}</span>
          <span className="ec-celebrate__rule" />
          <span className="ec-celebrate__filed">FILED</span>
        </div>
        <h2 className="text-headline text-[var(--ec-text-primary)]">{title}</h2>
        <p className="text-body mt-3 text-[var(--ec-text-secondary)]">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="ec-btn-primary mt-6 w-full justify-center inline-flex items-center gap-2"
        >
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            {stamp}
          </span>
          Open the desk
          <span className="font-mono text-[11px] font-bold" aria-hidden>
            -&gt;
          </span>
        </button>
      </div>
    </Sheet>
  )
}
