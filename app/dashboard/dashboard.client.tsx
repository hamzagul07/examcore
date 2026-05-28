'use client'

import { motion } from 'framer-motion'

/**
 * Dashboard entry animation. Wraps the whole dashboard so headers, stats,
 * actions, and the attempt list cascade in.
 */
export function DashboardEntry({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Per-row attempt animation. Lets each attempt slide in with a stagger.
 */
export function AttemptRowAnim({
  index,
  children,
}: {
  index: number
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: 0.05 + Math.min(index, 10) * 0.04,
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
