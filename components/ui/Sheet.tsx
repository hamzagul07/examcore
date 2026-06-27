'use client'

import { useEffect, useId, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock'

export type SheetProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Accessible label for the dialog */
  title?: string
  /** Id of a visible element to use as aria-labelledby (overrides sr-only title) */
  labelledById?: string
  className?: string
  /** Show drag handle on mobile */
  showHandle?: boolean
  /** Skip default bottom safe-area padding (custom inner layout) */
  compactPadding?: boolean
}

/**
 * Bottom sheet on mobile, centered modal on sm+.
 * Scroll lock, safe-area padding, backdrop dismiss.
 */
export function Sheet({
  open,
  onClose,
  children,
  title,
  labelledById,
  className,
  showHandle = true,
  compactPadding = false,
}: SheetProps) {
  const titleId = useId()
  useBodyScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[var(--ec-z-modal,90)] flex items-end justify-center p-0 sm:items-center sm:p-4"
          style={{ zIndex: 90 }}
        >
          <div
            className="absolute inset-0 ec-modal-backdrop"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledById ?? (title ? titleId : undefined)}
            className={cn(
              'ec-card relative z-10 max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] sm:max-w-md sm:rounded-2xl sm:p-8 sm:pt-8',
              compactPadding && 'p-0 pt-0 sm:p-0 sm:pt-0',
              className
            )}
            style={
              compactPadding
                ? undefined
                : {
                    paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
                  }
            }
          >
            {showHandle && (
              <div
                className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--ec-border)] sm:hidden"
                aria-hidden
              />
            )}
            {title && !labelledById ? (
              <h2 id={titleId} className="sr-only">
                {title}
              </h2>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--ec-text-secondary)] transition-colors hover:bg-[var(--ec-brand-muted)] hover:text-[var(--ec-text-primary)] sm:right-4 sm:top-4"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
