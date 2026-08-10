'use client'

import {
  DIAGRAM_AXIS,
  DIAGRAM_DEMAND,
  DIAGRAM_EQUILIBRIUM,
  DIAGRAM_GROWTH,
  DIAGRAM_INEFFICIENT,
  DIAGRAM_SHADE,
  DIAGRAM_TEXT,
} from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-5-production-possibility-curves'

/** Production possibility curve — scarcity, opportunity cost, efficiency. */
export function EconPpcDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg
      viewBox="0 0 420 240"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Production possibility curve"
    >
      <path
        d="M 56 44 Q 150 60 250 110 Q 320 150 368 190 L 56 190 Z"
        fill={DIAGRAM_SHADE}
        opacity={0.65}
      />
      <line x1="56" y1="190" x2="392" y2="190" stroke={DIAGRAM_AXIS} strokeWidth="1.75" />
      <line x1="56" y1="190" x2="56" y2="28" stroke={DIAGRAM_AXIS} strokeWidth="1.75" />
      <text x="14" y="40" fontSize="10" fontWeight="700" fill={DIAGRAM_AXIS}>
        Capital
      </text>
      <text x="300" y="208" fontSize="10" fontWeight="700" fill={DIAGRAM_AXIS}>
        Consumer goods
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <path
          d="M 56 44 Q 150 60 250 110 Q 320 150 368 190"
          fill="none"
          stroke={DIAGRAM_DEMAND}
          strokeWidth="2.75"
          strokeLinecap="round"
        />
        <text x="248" y="50" fontSize="10" fill={DIAGRAM_DEMAND} fontWeight="700">
          PPC frontier
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <circle cx="190" cy="150" r="5" fill={DIAGRAM_INEFFICIENT} stroke="#fff" strokeWidth="1.25" />
        <text x="148" y="168" fontSize="9" fill={DIAGRAM_INEFFICIENT} fontWeight="600">
          A · inefficient
        </text>
        <circle cx="240" cy="118" r="5.5" fill={DIAGRAM_EQUILIBRIUM} stroke="#fff" strokeWidth="1.25" />
        <text x="248" y="112" fontSize="9" fill={DIAGRAM_EQUILIBRIUM} fontWeight="700">
          B · efficient
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="78" y="216" fontSize="10" fill={DIAGRAM_GROWTH} fontWeight="600">
          Moving along the curve has an opportunity cost.
        </text>
        <text x="78" y="230" fontSize="9" fill={DIAGRAM_TEXT}>
          Outward shift = growth (more resources / better tech).
        </text>
      </g>
    </svg>
  )
}
