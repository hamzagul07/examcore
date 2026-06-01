'use client'

import { Children, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const },
  },
}

/** Dashboard entry with staggered section reveal. */
export function DashboardEntry({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()

  if (reduce) {
    return <>{children}</>
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      {Children.toArray(children).map((child, i) => (
        <motion.div key={i} variants={item}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}

/** Per-row attempt animation. Lets each attempt slide in with a stagger. */
export function AttemptRowAnim({
  index,
  children,
}: {
  index: number
  children: ReactNode
}) {
  const reduce = useReducedMotion()

  if (reduce) return <>{children}</>

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: 0.05 + Math.min(index, 10) * 0.04,
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1] as const,
      }}
    >
      {children}
    </motion.div>
  )
}
