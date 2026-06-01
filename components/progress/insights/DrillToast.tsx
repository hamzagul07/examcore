'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'

/**
 * Shown once when the student returns from a "Drill this" practice run
 * (/dashboard/progress?drilled=1). Confirms the loop closed and that insights
 * reflect the new mark. Strips the param from the URL so a refresh won't repeat.
 */
export function DrillToast() {
  const [show, setShow] = useState(false)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (url.searchParams.get('drilled') !== '1') return
    setShow(true)
    url.searchParams.delete('drilled')
    window.history.replaceState(window.history.state, '', url.toString())
    const t = setTimeout(() => setShow(false), 6000)
    return () => clearTimeout(t)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[var(--ec-z-toast,100)] -translate-x-1/2 px-4 lg:bottom-6"
          role="status"
        >
          <div className="ec-card flex items-center gap-3 px-4 py-3 shadow-[var(--ec-card-hover-shadow)]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--ec-brand)]/30 bg-[var(--ec-brand-muted)]">
              <Sparkles className="h-4 w-4 text-[var(--ec-brand)]" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-[var(--ec-text-primary)]">
              Updated insights based on your latest mark
            </p>
            <button
              type="button"
              onClick={() => setShow(false)}
              aria-label="Dismiss"
              className="ml-1 flex min-h-[44px] min-w-[44px] items-center justify-center text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-text-primary)] active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
