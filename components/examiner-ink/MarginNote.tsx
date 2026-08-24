'use client'

import { motion } from 'framer-motion'
import { MathText } from '@/components/MathText'

interface MarginNoteProps {
  note: string
  /** When true, render the arrow pointing left instead of right. The overlay
   *  flips this when a line is near the right edge of the image. */
  flip?: boolean
  /** On narrow viewports, stack the note below the line instead of beside it. */
  layout?: 'side' | 'below'
}

/**
 * Handwritten red-pen margin note with a curved arrow pointing back to the
 * line it annotates. Path lengths animate so the arrow "draws" itself,
 * mimicking how an examiner would actually mark on paper.
 */
export function MarginNote({ note, flip = false, layout = 'side' }: MarginNoteProps) {
  if (layout === 'below') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
        className="absolute left-0 right-0 top-full z-10 mt-1.5 max-w-[min(220px,85%)]"
        style={{ marginInline: flip ? 'auto 0' : '0 auto' }}
      >
        <div className="relative pt-3">
          <svg
            className="absolute -top-1 left-3 h-6 w-8"
            viewBox="0 0 32 24"
            fill="none"
            aria-hidden="true"
          >
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              d="M 16 22 Q 16 8 16 4"
              stroke="var(--ec-ink-crimson)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <p
            className="font-handwritten examiner-ink whitespace-normal text-base leading-tight text-left"
            style={{
              transform: 'rotate(-1.5deg)',
              transformOrigin: 'left top',
            }}
          >
            <MathText text={note} />
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: flip ? 10 : -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.35 }}
      // w-max matters: an absolutely-positioned box anchored at right-full /
      // left-full gets its shrink-to-fit width from the distance to the
      // container edge, not from its content. A note flipped left beside a
      // full-width line had ~2% of the sheet available, so it wrapped one
      // letter per line — a vertical "c/o/r/r/e/c/t" column down the paper.
      // w-max sizes it by content (capped at 220px) and lets it hang into the
      // margin, which is what a margin note is.
      className={`absolute top-full ${flip ? 'right-full mr-3' : 'left-full ml-3'} mt-1 w-max max-w-[220px]`}
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
          <MathText text={note} />
        </p>
      </div>
    </motion.div>
  )
}
