'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '3-2-methods-and-effects-of-government-intervention-in-markets'

/** Indirect tax shifts supply up — wedge between price paid and received. */
export function EconInterventionDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Government intervention: indirect tax on a market">
      <line x1="56" y1="190" x2="392" y2="190" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1="56" y1="190" x2="56" y2="28" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="40" y="34" fontSize="10" fill={DIAGRAM_TEXT}>P</text>
      <text x="388" y="206" fontSize="10" fill={DIAGRAM_TEXT}>Q</text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line x1="70" y1="50" x2="370" y2="185" stroke={DIAGRAM_TEXT} strokeWidth="2" />
        <text x="346" y="178" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">D</text>
        <line x1="70" y1="178" x2="370" y2="60" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="346" y="66" fontSize="10" fill={DIAGRAM_STROKE} fontWeight="600">S</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1="70" y1="140" x2="370" y2="22" stroke={DIAGRAM_STROKE} strokeWidth="2" strokeDasharray="6 4" />
        <text x="300" y="30" fontSize="9" fill={DIAGRAM_STROKE}>S + tax</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <line x1="190" y1="78" x2="190" y2="112" stroke={DIAGRAM_TEXT} strokeWidth="6" opacity="0.35" />
        <text x="92" y="216" fontSize="9" fill={DIAGRAM_TEXT}>Tax wedge raises price, lowers quantity traded.</text>
      </g>
    </svg>
  )
}
