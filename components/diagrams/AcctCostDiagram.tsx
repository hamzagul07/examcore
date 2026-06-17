'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '5-4-1-cost-information'

/** Cost behaviour — fixed plus variable costs make total cost. */
export function AcctCostDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Cost behaviour: fixed, variable, and total cost">
      <line x1="56" y1="190" x2="392" y2="190" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1="56" y1="190" x2="56" y2="28" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="22" y="34" fontSize="9" fill={DIAGRAM_TEXT}>Cost</text>
      <text x="344" y="206" fontSize="9" fill={DIAGRAM_TEXT}>Output</text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line x1="56" y1="150" x2="384" y2="150" stroke={DIAGRAM_TEXT} strokeWidth="2" strokeDasharray="7 5" />
        <text x="300" y="144" fontSize="9" fill={DIAGRAM_TEXT}>Fixed cost</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1="56" y1="190" x2="384" y2="92" stroke={DIAGRAM_TEXT} strokeWidth="2" />
        <text x="300" y="104" fontSize="9" fill={DIAGRAM_TEXT}>Variable cost</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <line x1="56" y1="150" x2="384" y2="52" stroke="var(--ink, var(--ec-brand))" strokeWidth="2.25" />
        <text x="294" y="56" fontSize="9" fill={DIAGRAM_STROKE} fontWeight="600">Total cost</text>
      </g>
      <text x="64" y="216" fontSize="9" fill={DIAGRAM_TEXT}>Total cost = fixed cost + variable cost per unit × output.</text>
    </svg>
  )
}
