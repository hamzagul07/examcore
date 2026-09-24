'use client'

import { useCountUp } from '@/lib/hooks/useCountUp'

type Props = {
  value: number
  /** Total animation time; keep it short — this runs on every landing. */
  durationMs?: number
  /** Decimal places to show (default 0). */
  decimals?: number
  className?: string
}

/**
 * A figure that counts up to its value on mount. Safe inside server
 * components. Pair with tabular figures on the parent so width holds.
 */
export function CountUp({ value, durationMs = 600, decimals = 0, className }: Props) {
  const shown = useCountUp(value, durationMs)
  return <span className={className}>{shown.toFixed(decimals)}</span>
}
