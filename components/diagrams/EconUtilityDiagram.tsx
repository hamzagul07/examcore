'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '7-2-indifference-curves-and-budget-lines'

/** Consumer optimum: indifference curve tangent to the budget line. */
export function EconUtilityDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Indifference curve tangent to a budget line">
      <line x1="56" y1="190" x2="392" y2="190" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1="56" y1="190" x2="56" y2="28" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="24" y="34" fontSize="9" fill={DIAGRAM_TEXT}>Good Y</text>
      <text x="344" y="206" fontSize="9" fill={DIAGRAM_TEXT}>Good X</text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line x1="80" y1="44" x2="360" y2="185" stroke={DIAGRAM_TEXT} strokeWidth="2.25" />
        <text x="300" y="178" fontSize="9" fill={DIAGRAM_TEXT}>Budget line</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <path d="M 90 150 Q 180 96 210 92 Q 300 84 350 60" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.25" />
        <text x="296" y="58" fontSize="9" fill={DIAGRAM_STROKE}>Indifference curve</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <circle cx="196" cy="113" r="4.5" fill="var(--ink, var(--ec-brand))" />
        <text x="96" y="216" fontSize="9" fill={DIAGRAM_TEXT}>Optimum where the curve is tangent to the budget line.</text>
      </g>
    </svg>
  )
}
