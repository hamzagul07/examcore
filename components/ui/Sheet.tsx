'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [mounted, setMounted] = useState(false)
  useBodyScrollLock(open)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const sheet = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[var(--ec-z-modal,250)] flex items-end justify-center p-0 sm:items-center sm:p-4"
          style={{ zIndex: 250 }}
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
              'ec-card ec-card--paper relative z-10 max-h-[90dvh] w-full overflow-y-auto rounded-t-xl p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] sm:max-w-md sm:rounded sm:p-8 sm:pt-8',
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
                className="mx-auto mb-3 h-1 w-10 rounded-[2px] bg-[var(--ec-border)] sm:hidden"
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
              className="absolute right-3 top-3 z-20 flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-[var(--ec-text-secondary)] transition-colors hover:bg-[var(--ec-brand-muted)] hover:text-[var(--ec-text-primary)] sm:right-4 sm:top-4"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path
                  d="M4.5 4.5 L13.5 13.5 M13.5 4.5 L4.5 13.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  if (!mounted) return null
  return createPortal(sheet, document.body)
}
