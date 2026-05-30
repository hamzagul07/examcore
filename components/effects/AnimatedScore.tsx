'use client'

import { motion } from 'framer-motion'

type AnimatedScoreProps = {
  earned: number
  total: number
  /** Optional caption beneath the number, e.g. "marks earned". */
  caption?: string
}

/**
 * Score reveal after marking — prominent but not overpowering.
 * Uses theme tokens so it reads cleanly in both Late Night and Zen.
 */
export function AnimatedScore({ earned, total, caption }: AnimatedScoreProps) {
  const pct = total > 0 ? (earned / total) * 100 : 0
  const band =
    pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'critical'

  return (
    <div className="relative">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 22,
          delay: 0.1,
        }}
        className="text-center"
      >
        <div
          className={`ec-score-display ec-score-display--${band}`}
          aria-label={`${earned} out of ${total} marks`}
        >
          <motion.span
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: 0.25,
              type: 'spring',
              stiffness: 280,
              damping: 22,
            }}
            className="ec-score-display__earned tabular-nums"
          >
            {earned}
          </motion.span>
          <span className="ec-score-display__slash" aria-hidden="true">
            /
          </span>
          <motion.span
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: 0.35,
              type: 'spring',
              stiffness: 280,
              damping: 22,
            }}
            className="ec-score-display__total tabular-nums"
          >
            {total}
          </motion.span>
        </div>

        {caption && (
          <motion.p
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.35 }}
            className="ec-score-display__caption"
          >
            {caption}
          </motion.p>
        )}
      </motion.div>
    </div>
  )
}
