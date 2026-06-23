'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type ButtonLoadingMode = 'shimmer' | 'morph' | 'progress' | 'success'

type Props = {
  mode?: ButtonLoadingMode
  loadingText?: string
  children?: React.ReactNode
  className?: string
  /** Called after success checkmark animation (~600ms). */
  onSuccessComplete?: () => void
}

export function ButtonLoadingState({
  mode = 'shimmer',
  loadingText,
  children,
  className,
  onSuccessComplete,
}: Props) {
  const prefersReduced = useReducedMotion()

  if (mode === 'success') {
    return (
      <motion.span
        className={cn('inline-flex items-center gap-2', className)}
        initial={prefersReduced ? false : { opacity: 0.6 }}
        animate={{ opacity: 1 }}
        onAnimationComplete={() => {
          if (!prefersReduced) {
            window.setTimeout(() => onSuccessComplete?.(), 400)
          } else {
            onSuccessComplete?.()
          }
        }}
      >
        <svg
          className="shrink-0"
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <motion.path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={prefersReduced ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </svg>
        <span>{loadingText ?? children}</span>
      </motion.span>
    )
  }

  if (mode === 'morph') {
    return (
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key="loading"
          className={cn('inline-flex items-center gap-2', className)}
          initial={prefersReduced ? false : { opacity: 0, y: 4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={prefersReduced ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          <span className="ec-btn-loading-wrap ec-btn-shimmer inline-flex min-w-0 items-center gap-2 rounded-[inherit] px-0">
            <span>{loadingText ?? children}</span>
          </span>
        </motion.span>
      </AnimatePresence>
    )
  }

  if (mode === 'progress') {
    return (
      <span className={cn('relative inline-flex w-full min-w-0 items-center justify-center gap-2', className)}>
        <span>{loadingText ?? children}</span>
        <span className="ec-btn-progress-track" aria-hidden>
          <span className="ec-btn-progress-fill block" />
        </span>
      </span>
    )
  }

  /* shimmer (default) */
  return (
    <span className={cn('ec-btn-loading-wrap ec-btn-shimmer inline-flex items-center gap-2', className)}>
      <span>{loadingText ?? children}</span>
    </span>
  )
}

/** Small pulse for inline save indicators (toggles, chips). */
export function InlineSavingPulse({ className }: { className?: string }) {
  return <span className={cn('ec-inline-saving', className)} aria-hidden />
}

/** Corner pulse for card links — no spinner. */
export function CardLoadingPulse({ className }: { className?: string }) {
  return <span className={cn('ec-btn-pulse-ring', className)} aria-hidden />
}
