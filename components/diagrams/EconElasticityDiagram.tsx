'use client'

import {
  DIAGRAM_AXIS,
  DIAGRAM_DEMAND,
  DIAGRAM_EQUILIBRIUM,
  DIAGRAM_SUPPLY,
  DIAGRAM_TEXT,
} from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '2-2-price-elasticity-income-elasticity-and-cross-elasticity-of-demand'

/** Steep (inelastic) vs flat (elastic) demand through a common point. */
export function EconElasticityDiagram({
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
      aria-label="Price elasticity of demand: inelastic vs elastic"
    >
      <line x1="56" y1="190" x2="392" y2="190" stroke={DIAGRAM_AXIS} strokeWidth="1.75" />
      <line x1="56" y1="190" x2="56" y2="28" stroke={DIAGRAM_AXIS} strokeWidth="1.75" />
      <text x="40" y="34" fontSize="11" fontWeight="700" fill={DIAGRAM_AXIS}>
        P
      </text>
      <text x="388" y="206" fontSize="11" fontWeight="700" fill={DIAGRAM_AXIS}>
        Q
      </text>
      <circle cx="224" cy="108" r="5" fill={DIAGRAM_EQUILIBRIUM} stroke="#fff" strokeWidth="1.25" />

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line
          x1="196"
          y1="40"
          x2="252"
          y2="180"
          stroke={DIAGRAM_SUPPLY}
          strokeWidth="2.75"
          strokeLinecap="round"
        />
        <text x="118" y="52" fontSize="10" fill={DIAGRAM_SUPPLY} fontWeight="700">
          Inelastic (steep): PED &lt; 1
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line
          x1="96"
          y1="92"
          x2="372"
          y2="128"
          stroke={DIAGRAM_DEMAND}
          strokeWidth="2.75"
          strokeLinecap="round"
        />
        <text x="248" y="152" fontSize="10" fill={DIAGRAM_DEMAND} fontWeight="700">
          Elastic (flat): PED &gt; 1
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="100" y="216" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          PED = %ΔQd ÷ %ΔP — flatter ⇒ more responsive
        </text>
      </g>
    </svg>
  )
}
