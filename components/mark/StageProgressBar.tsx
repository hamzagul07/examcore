'use client'

import { motion } from 'framer-motion'

/** Slim segmented progress — stage-driven, no numeric label. */
export function StageProgressBar({ percent }: { percent: number }) {
  const v = Math.max(0, Math.min(100, percent))

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      aria-label="Marking stage progress"
      className="h-[3px] w-full overflow-hidden rounded-full"
      style={{
        background: 'var(--ec-border, rgba(255,255,255,0.12))',
      }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: 'var(--ec-brand)' }}
        initial={{ width: 0 }}
        animate={{ width: `${v}%` }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  )
}
