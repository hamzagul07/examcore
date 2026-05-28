'use client'

import { motion } from 'framer-motion'
import { useId } from 'react'

interface UnderlineMarkProps {
  earned: boolean
}

/**
 * Red wavy underline that examiners scrawl beneath the line where a mark was
 * lost. Drawn as a tilted-cubic path scaled to the bbox, with a turbulence
 * filter to keep the stroke from looking laser-clean. Animates pathLength so
 * the line "writes" in.
 *
 * No underline for earned marks — examiners don't underline things you got
 * right, so neither do we.
 */
export function UnderlineMark({ earned }: UnderlineMarkProps) {
  // Filter IDs must be unique per instance; multiple underlines on one page
  // collided when we hard-coded "ink-roughness".
  const filterId = useId()

  if (earned) return null

  return (
    <svg
      className="absolute inset-0 h-full w-full pointer-events-none"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <defs>
        <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence baseFrequency="0.06" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="1.4" />
        </filter>
      </defs>
      <motion.path
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
        d="M 2 84 Q 25 76 50 86 T 98 80"
        stroke="#dc2626"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        vectorEffect="non-scaling-stroke"
        style={{ filter: `url(#${filterId})` }}
      />
    </svg>
  )
}
