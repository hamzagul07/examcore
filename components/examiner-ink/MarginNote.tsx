'use client'

import { motion } from 'framer-motion'

interface MarginNoteProps {
  note: string
  /** When true, render the arrow pointing left instead of right. The overlay
   *  flips this when a line is near the right edge of the image. */
  flip?: boolean
}

/**
 * Handwritten red-pen margin note with a curved arrow pointing back to the
 * line it annotates. Path lengths animate so the arrow "draws" itself,
 * mimicking how an examiner would actually mark on paper.
 */
export function MarginNote({ note, flip = false }: MarginNoteProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: flip ? 10 : -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.35 }}
      className={`absolute top-full ${flip ? 'right-full mr-3' : 'left-full ml-3'} mt-1 max-w-[220px]`}
    >
      <div className="relative">
        <svg
          className={`absolute -top-2 h-8 w-12 ${flip ? '-right-12' : '-left-12'}`}
          viewBox="0 0 50 30"
          fill="none"
          aria-hidden="true"
        >
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            d={flip ? 'M 45 15 Q 25 5 5 15' : 'M 5 15 Q 25 5 45 15'}
            stroke="var(--ec-ink-crimson)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.25, delay: 0.45, ease: 'easeOut' }}
            d={flip ? 'M 10 10 L 5 15 L 10 20' : 'M 40 10 L 45 15 L 40 20'}
            stroke="var(--ec-ink-crimson)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>

        <p
          className={`font-handwritten examiner-ink whitespace-normal text-lg leading-tight ${
            flip ? 'text-right' : 'text-left'
          }`}
          style={{
            transform: 'rotate(-2deg)',
            transformOrigin: flip ? 'right top' : 'left top',
          }}
        >
          {note}
        </p>
      </div>
    </motion.div>
  )
}
