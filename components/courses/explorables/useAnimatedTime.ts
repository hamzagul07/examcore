'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Auto-advancing normalized time in [0, 1), looping, for animated explorables
 * (waves, SHM, projectile). Plays by default so the diagram is "live"; honours
 * prefers-reduced-motion. Scrubbing pauses it so the user takes control.
 */
export function useAnimatedTime(speedPerSec = 0.25, initial = 0) {
  const [t, setT] = useState(initial)
  const [playing, setPlaying] = useState(true)
  const raf = useRef<number | null>(null)
  const last = useRef<number | null>(null)

  useEffect(() => {
    if (!playing) return
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setPlaying(false)
      return
    }
    const tick = (now: number) => {
      if (last.current != null) {
        const dt = (now - last.current) / 1000
        setT((prev) => (prev + dt * speedPerSec) % 1)
      }
      last.current = now
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
      last.current = null
    }
  }, [playing, speedPerSec])

  /** Scrub to a value and pause (user takes over). */
  const scrub = (v: number) => {
    setPlaying(false)
    setT(v)
  }

  return { t, scrub, playing, toggle: () => setPlaying((p) => !p) }
}
