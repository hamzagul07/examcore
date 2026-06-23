'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/** Section reveal — transform-only (content visible if animation fails). */
export function LandingSectionReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const prefersReduced = useReducedMotion()

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 10 }}
      whileInView={prefersReduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={
        prefersReduced
          ? undefined
          : { duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] }
      }
      className={className}
    >
      {children}
    </motion.div>
  )
}
