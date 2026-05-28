'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

/**
 * Animated count-up for the big coverage number on /dashboard/progress.
 *
 * - Springs from 0 → value over ~1.4s with an ease-out.
 * - Adds a subtle "brand-breathe" emerald aura so the figure feels alive.
 */
export function AnimatedCoverageNumber({ value }: { value: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.4,
      ease: [0.4, 0, 0.2, 1],
    })
    const unsub = rounded.on('change', (v) => setDisplay(v))
    return () => {
      controls.stop()
      unsub()
    }
  }, [value, count, rounded])

  return (
    <motion.span
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      className="ec-text-gradient brand-breathe text-6xl font-extrabold leading-none tracking-[-0.04em] sm:text-7xl md:text-[112px]"
    >
      {display}
    </motion.span>
  )
}
