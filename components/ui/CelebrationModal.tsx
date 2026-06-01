'use client'

import { EmptyStateIllustration } from '@/components/ui/EmptyStateIllustration'
import { Sheet } from '@/components/ui/Sheet'

type CelebrationModalProps = {
  open: boolean
  title: string
  message: string
  onDismiss: () => void
}

/** Subtle once-per-user acknowledgment — no confetti, no gamification. */
export function CelebrationModal({
  open,
  title,
  message,
  onDismiss,
}: CelebrationModalProps) {
  return (
    <Sheet open={open} onClose={onDismiss} title={title}>
      <div className="pt-2 text-center">
        <div className="mx-auto mb-4">
          <EmptyStateIllustration variant="success" size={120} />
        </div>
        <h2 className="text-headline text-[var(--ec-text-primary)]">{title}</h2>
        <p className="text-body mt-3 text-[var(--ec-text-secondary)]">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="ec-btn-primary mt-6 w-full justify-center"
        >
          Continue
        </button>
      </div>
    </Sheet>
  )
}
