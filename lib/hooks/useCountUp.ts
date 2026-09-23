'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Ease-out count-up for figures that land (a score, a streak, days to go).
 *
 * Returns the final value immediately when the OS prefers reduced motion or
 * `enabled` is false, so the number never lags behind for those users. Runs
 * once per target change, never per re-render.
 */
export function useCountUp(
  target: number,
  durationMs = 600,
  enabled = true
): number {
  const [value, setValue] = useState(enabled ? 0 : target)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!enabled || reduce || !Number.isFinite(target)) {
      setValue(target)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(target * eased)
      if (t < 1) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current)
    }
  }, [target, durationMs, enabled])

  return value
}
