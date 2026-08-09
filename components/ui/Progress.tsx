'use client'

import { motion } from 'framer-motion'

type ProgressProps = {
  /** 0-100. Anything outside is clamped. */
  value: number
  variant?: 'emerald' | 'gradient' | 'spectrum'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
  /** Optional aria-label since this is a visual-only meter. */
  ariaLabel?: string
}

const SIZE_CLASS: Record<NonNullable<ProgressProps['size']>, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-3.5',
}

/**
 * Animated progress bar — paper track, hard fill, no SaaS glow.
 * Width animates on mount; shimmer on the fill keeps static values alive.
 */
export function Progress({
  value,
  variant = 'gradient',
  size = 'md',
  showLabel = false,
  className = '',
  ariaLabel,
}: ProgressProps) {
  const v = Math.max(0, Math.min(100, value))

  const fillClass =
    variant === 'spectrum'
      ? 'ec-progress-fill-spectrum animate-shimmer'
      : variant === 'gradient'
        ? 'ec-progress-fill-shimmer animate-shimmer'
        : 'ec-progress-fill-brand animate-shimmer'

  return (
    <div className={`w-full ${className}`}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        aria-label={ariaLabel}
        className={`relative w-full overflow-hidden rounded-[2px] border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))] ${SIZE_CLASS[size]}`}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${v}%` }}
          transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
          className={`absolute inset-y-0 left-0 rounded-[1px] ${fillClass}`}
          style={{ backgroundSize: '200% 100%' }}
        />
      </div>
      {showLabel && (
        <p className="mt-2 text-sm font-semibold text-[var(--ec-text-primary)]">{v}%</p>
      )}
    </div>
  )
}
