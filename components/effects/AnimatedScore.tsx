'use client'

import { motion } from 'framer-motion'

type AnimatedScoreProps = {
  earned: number
  total: number
  /** Optional caption beneath the number, e.g. "marks earned". */
  caption?: string
}

/**
 * Big dramatic score reveal — used after marking finishes.
 *
 * - Whole block spring-pops in from scale 0
 * - Earned and total numbers slide up independently with staggered timing
 * - Drop shadow + colored glow makes the number feel physically lit
 * - Color follows the grade band (emerald / amber / red)
 */
export function AnimatedScore({ earned, total, caption }: AnimatedScoreProps) {
  const pct = total > 0 ? (earned / total) * 100 : 0
  const band =
    pct >= 80
      ? {
          color: 'text-emerald-400',
          glow: 'rgba(16, 185, 129, 0.65)',
          glow2: 'rgba(16, 185, 129, 0.35)',
        }
      : pct >= 50
      ? {
          color: 'text-amber-400',
          glow: 'rgba(245, 158, 11, 0.6)',
          glow2: 'rgba(245, 158, 11, 0.3)',
        }
      : {
          color: 'text-red-400',
          glow: 'rgba(239, 68, 68, 0.6)',
          glow2: 'rgba(239, 68, 68, 0.3)',
        }

  return (
    <div className="relative">
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 16,
          delay: 0.15,
        }}
        className="text-center"
      >
        <div
          className={`text-[112px] font-extrabold leading-none tracking-[-0.045em] sm:text-[144px] md:text-[180px] ${band.color}`}
          style={{
            textShadow: `0 0 80px ${band.glow}, 0 0 160px ${band.glow2}, 0 8px 32px rgba(0, 0, 0, 0.4)`,
            filter: `drop-shadow(0 12px 32px ${band.glow2})`,
          }}
        >
          <motion.span
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: 0.4,
              type: 'spring',
              stiffness: 220,
              damping: 18,
            }}
            className="inline-block"
          >
            {earned}
          </motion.span>
          <span className="mx-1 text-slate-700 sm:mx-2">/</span>
          <motion.span
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: 0.55,
              type: 'spring',
              stiffness: 220,
              damping: 18,
            }}
            className="inline-block text-slate-700"
          >
            {total}
          </motion.span>
        </div>
        {caption && (
          <motion.p
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.4 }}
            className="mt-5 font-mono text-base font-medium text-slate-400 sm:text-lg"
          >
            {caption}
          </motion.p>
        )}
      </motion.div>
    </div>
  )
}
