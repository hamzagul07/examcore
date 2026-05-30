'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { EmptyStateIllustration } from '@/components/ui/EmptyStateIllustration'

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
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onDismiss}
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="ec-card relative z-10 w-full max-w-sm p-8 text-center"
          >
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
