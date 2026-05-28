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
 * Animated progress bar with shimmer flow + leading-edge glow.
 *
 * - Width animates from 0 to value with a soft cubic ease on mount.
 * - The fill is a moving gradient (`animate-shimmer` from globals.css) so
 *   the bar looks alive even when value is static.
 * - A small white blur sits at the leading edge for a "light running along
 *   the wire" feel — Brilliant/Linear use this.
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
      ? 'bg-gradient-to-r from-red-400 via-amber-400 to-emerald-500 animate-shimmer'
      : variant === 'gradient'
      ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 animate-shimmer'
      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 animate-shimmer'

  return (
    <div className={`w-full ${className}`}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        aria-label={ariaLabel}
        className={`relative w-full overflow-hidden rounded-full border border-white/5 bg-dark-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] ${SIZE_CLASS[size]}`}
      >
        {/* Animated fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${v}%` }}
          transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
          className={`absolute inset-y-0 left-0 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)] ${fillClass}`}
          style={{ backgroundSize: '200% 100%' }}
        />

        {/* Leading-edge glow — slides with the fill */}
        <motion.div
          initial={{ left: '0%' }}
          animate={{ left: `${v}%` }}
          transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
          className="pointer-events-none absolute inset-y-0 -ml-3 w-6 bg-white/60 blur-md"
        />
      </div>
      {showLabel && (
        <p className="mt-2 text-sm font-semibold text-slate-700">{v}%</p>
      )}
    </div>
  )
}
