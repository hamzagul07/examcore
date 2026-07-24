'use client'

import { useEffect } from 'react'
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

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
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
  // Fire the success callback on a fixed timer instead of an animation-complete
  // event — deterministic, and works even under prefers-reduced-motion.
  useEffect(() => {
    if (mode !== 'success' || !onSuccessComplete) return
    const delay = prefersReducedMotion() ? 0 : 600
    const t = window.setTimeout(() => onSuccessComplete(), delay)
    return () => window.clearTimeout(t)
  }, [mode, onSuccessComplete])

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
      <span className={cn('inline-flex items-center gap-2', className)}>
        <svg
          className="ec-check-draw shrink-0"
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{loadingText ?? children}</span>
      </span>
    )
  }

  if (mode === 'morph') {
    return (
      <span
        className={cn(
          'ec-btn-morph-in inline-flex items-center gap-2',
          className
        )}
      >
        <LoadingDots />
        <span>{loadingText ?? children}</span>
      </span>
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
