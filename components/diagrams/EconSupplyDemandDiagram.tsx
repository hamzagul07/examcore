'use client'

import {
  DIAGRAM_AXIS,
  DIAGRAM_DEMAND,
  DIAGRAM_EQUILIBRIUM,
  DIAGRAM_GUIDE,
  DIAGRAM_SHADE,
  DIAGRAM_SUPPLY,
  DIAGRAM_TEXT,
} from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '2-1-demand-and-supply-curves'

/** Demand and supply meeting at market equilibrium (P*, Q*). */
export function EconSupplyDemandDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  const ex = 228
  const ey = 119
  return (
    <svg
      viewBox="0 0 420 240"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Supply and demand equilibrium"
    >
      <rect x="56" y="28" width="336" height="162" fill={DIAGRAM_SHADE} opacity="0.55" />
      <line x1="56" y1="190" x2="392" y2="190" stroke={DIAGRAM_AXIS} strokeWidth="1.75" />
      <line x1="56" y1="190" x2="56" y2="28" stroke={DIAGRAM_AXIS} strokeWidth="1.75" />
      <text x="40" y="34" fontSize="11" fontWeight="700" fill={DIAGRAM_AXIS}>
        P
      </text>
      <text x="388" y="206" fontSize="11" fontWeight="700" fill={DIAGRAM_AXIS}>
        Q
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line x1="70" y1="50" x2="380" y2="185" stroke={DIAGRAM_DEMAND} strokeWidth="2.75" strokeLinecap="round" />
        <text x="352" y="178" fontSize="12" fill={DIAGRAM_DEMAND} fontWeight="700">
          D
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1="70" y1="185" x2="380" y2="55" stroke={DIAGRAM_SUPPLY} strokeWidth="2.75" strokeLinecap="round" />
        <text x="352" y="62" fontSize="12" fill={DIAGRAM_SUPPLY} fontWeight="700">
          S
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <circle cx={ex} cy={ey} r="6" fill={DIAGRAM_EQUILIBRIUM} stroke="#fff" strokeWidth="1.5" />
        <line
          x1={ex}
          y1={ey}
          x2={ex}
          y2="190"
          stroke={DIAGRAM_GUIDE}
          strokeWidth="1.25"
          strokeDasharray="4 3"
        />
        <line
          x1={ex}
          y1={ey}
          x2="56"
          y2={ey}
          stroke={DIAGRAM_GUIDE}
          strokeWidth="1.25"
          strokeDasharray="4 3"
        />
        <text x="38" y={ey + 4} fontSize="10" fill={DIAGRAM_EQUILIBRIUM} fontWeight="700">
          P*
        </text>
        <text x={ex - 6} y="206" fontSize="10" fill={DIAGRAM_EQUILIBRIUM} fontWeight="700">
          Q*
        </text>
        <text x="118" y="42" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Equilibrium: Qd = Qs
        </text>
      </g>
    </svg>
  )
}
