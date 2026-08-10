'use client'

import {
  DIAGRAM_AXIS,
  DIAGRAM_DEMAND,
  DIAGRAM_EQUILIBRIUM,
  DIAGRAM_GUIDE,
  DIAGRAM_SHADE_WARM,
  DIAGRAM_SUPPLY,
  DIAGRAM_TEXT,
} from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '4-3-aggregate-demand-and-aggregate-supply-analysis'

/** AD–AS: macroeconomic equilibrium of price level and real output. */
export function EconMacroDiagram({
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
      aria-label="Aggregate demand and aggregate supply equilibrium"
    >
      <rect x="56" y="28" width="336" height="162" fill={DIAGRAM_SHADE_WARM} opacity="0.5" />
      <line x1="56" y1="190" x2="392" y2="190" stroke={DIAGRAM_AXIS} strokeWidth="1.75" />
      <line x1="56" y1="190" x2="56" y2="28" stroke={DIAGRAM_AXIS} strokeWidth="1.75" />
      <text x="18" y="34" fontSize="10" fontWeight="700" fill={DIAGRAM_AXIS}>
        Price level
      </text>
      <text x="300" y="208" fontSize="10" fontWeight="700" fill={DIAGRAM_AXIS}>
        Real output (Y)
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line x1="70" y1="50" x2="380" y2="185" stroke={DIAGRAM_DEMAND} strokeWidth="2.75" strokeLinecap="round" />
        <text x="348" y="178" fontSize="12" fill={DIAGRAM_DEMAND} fontWeight="700">
          AD
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <path
          d="M 80 185 L 230 110 Q 320 60 330 32"
          fill="none"
          stroke={DIAGRAM_SUPPLY}
          strokeWidth="2.75"
          strokeLinecap="round"
        />
        <text x="300" y="44" fontSize="12" fill={DIAGRAM_SUPPLY} fontWeight="700">
          AS
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <circle cx="214" cy="118" r="6" fill={DIAGRAM_EQUILIBRIUM} stroke="#fff" strokeWidth="1.5" />
        <line
          x1="214"
          y1="118"
          x2="56"
          y2="118"
          stroke={DIAGRAM_GUIDE}
          strokeWidth="1.25"
          strokeDasharray="4 3"
        />
        <line
          x1="214"
          y1="118"
          x2="214"
          y2="190"
          stroke={DIAGRAM_GUIDE}
          strokeWidth="1.25"
          strokeDasharray="4 3"
        />
        <text x="88" y="216" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Equilibrium sets the price level and national output.
        </text>
      </g>
    </svg>
  )
}
