'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type ButtonLoadingMode = 'shimmer' | 'morph' | 'progress' | 'success' | 'exam'

function LoadingDots({ className }: { className?: string }) {
  return (
    <span className={cn('ec-loading-dots', className)} aria-hidden>
      <span />
      <span />
      <span />
    </span>
  )
}

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

  if (mode === 'exam') {
    return (
      <span className={cn('ec-exam-loader-inline', className)}>
        <span className="ec-exam-loader-orbit" aria-hidden>
          <span className="ec-exam-loader-dot ec-exam-loader-dot--math" />
          <span className="ec-exam-loader-dot ec-exam-loader-dot--brand" />
          <span className="ec-exam-loader-dot ec-exam-loader-dot--phys" />
          <span className="ec-exam-loader-dot ec-exam-loader-dot--chem" />
          <span className="ec-exam-loader-core">✎</span>
        </span>
        <span>{loadingText ?? children}</span>
      </span>
    )
  }

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
          <LoadingDots />
          <span>{loadingText ?? children}</span>
        </motion.span>
      </AnimatePresence>
    )
  }

  if (mode === 'progress') {
    return (
      <span
        className={cn(
          'relative inline-flex w-full min-w-0 items-center justify-center gap-2',
          className
        )}
      >
        <LoadingDots />
        <span>{loadingText ?? children}</span>
        <span className="ec-btn-progress-track" aria-hidden>
          <span className="ec-btn-progress-fill block" />
        </span>
      </span>
    )
  }

  /* shimmer (default) */
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LoadingDots />
      <span className="ec-btn-loading-wrap ec-btn-shimmer inline-flex min-w-0 items-center rounded-[inherit]">
        <span>{loadingText ?? children}</span>
      </span>
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
