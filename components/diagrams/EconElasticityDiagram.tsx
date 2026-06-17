'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
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
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Price elasticity of demand: inelastic vs elastic">
      <line x1="56" y1="190" x2="392" y2="190" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1="56" y1="190" x2="56" y2="28" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="40" y="34" fontSize="10" fill={DIAGRAM_TEXT}>P</text>
      <text x="388" y="206" fontSize="10" fill={DIAGRAM_TEXT}>Q</text>
      <circle cx="224" cy="108" r="3.5" fill={DIAGRAM_TEXT} />

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line x1="196" y1="40" x2="252" y2="180" stroke={DIAGRAM_TEXT} strokeWidth="2.25" />
        <text x="150" y="52" fontSize="9" fill={DIAGRAM_TEXT}>Inelastic (steep): PED &lt; 1</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1="96" y1="92" x2="372" y2="128" stroke={DIAGRAM_STROKE} strokeWidth="2.25" />
        <text x="250" y="150" fontSize="9" fill={DIAGRAM_STROKE}>Elastic (flat): PED &gt; 1</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="120" y="214" fontSize="9" fill={DIAGRAM_TEXT}>PED = %ΔQd ÷ %ΔP — flatter ⇒ more responsive</text>
      </g>
    </svg>
  )
}
