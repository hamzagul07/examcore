'use client'

import { motion } from 'framer-motion'
import { useId } from 'react'

interface MarkStampProps {
  /** Stamp code, e.g. "B1", "M1", "A1". Earned-status flips the prefix. */
  markId: string
  earned: boolean
}

/**
 * Red-pen stamp that lives on the right margin of a working line.
 *
 *   earned=true  → "M1 ✓" in green, slight wobble (we don't want to over-
 *                  reward correctness — examiners tick, they don't celebrate).
 *   earned=false → "M0" in red with a hand-drawn strike-through diagonal.
 *
 * Both rotations are intentional: typed-perfect stamps would betray the
 * "real examiner" effect we're going for.
 */
export function MarkStamp({ markId, earned }: MarkStampProps) {
  const strikeId = useId()

  // Earned marks keep their original code (e.g. "M1"); lost marks substitute
  // the value digit with 0 ("M1" → "M0", "A2" → "A0") which is how examiners
  // actually write them on real Cambridge scripts.
  const displayId = earned
    ? markId
    : markId.replace(/(\D+)(\d+)/, (_, prefix) => `${prefix}0`)

  const color = earned ? 'var(--ec-brand)' : 'var(--ec-ink-crimson)'

  return (
    <motion.div
      initial={{ opacity: 0, rotate: -15, scale: 0.5 }}
      animate={{ opacity: 1, rotate: -6, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 16, delay: 0.18 }}
      className="relative inline-flex select-none items-center"
      style={{
        filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.08))',
      }}
    >
      <span
        className="font-examiner inline-flex items-center gap-1 rounded-md border-2 px-2 py-0.5 text-xl font-bold"
        style={{
          color,
          borderColor: color,
          /* Fixed paper white, NOT --ec-paper. The stamp sits on a photograph
             of the student's actual page, which is light in every theme — so a
             themed surface token turns the backing plate dark in night mode and
             the stamps read as grey blocks smudged across white paper. */
          background: 'rgba(252, 251, 247, 0.92)',
        }}
      >
        <span>{displayId}</span>
        {earned && (
          <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.25 }}
            aria-hidden="true"
          >
            ✓
          </motion.span>
        )}
      </span>

      {!earned && (
        <svg
          className="absolute inset-0 pointer-events-none"
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <motion.line
            key={strikeId}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.4, duration: 0.3, ease: 'easeOut' }}
            x1="6"
            y1="34"
            x2="94"
            y2="6"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
    </motion.div>
  )
}
