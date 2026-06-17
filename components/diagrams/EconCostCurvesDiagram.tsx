'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '7-5-types-of-cost-revenue-and-profit-short-run-and-long-run-production'

/** U-shaped average cost cut at its minimum by marginal cost. */
export function EconCostCurvesDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Average and marginal cost curves">
      <line x1="56" y1="190" x2="392" y2="190" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1="56" y1="190" x2="56" y2="28" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="22" y="34" fontSize="9" fill={DIAGRAM_TEXT}>Cost</text>
      <text x="350" y="206" fontSize="9" fill={DIAGRAM_TEXT}>Output</text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <path d="M 80 90 Q 200 200 360 120" fill="none" stroke={DIAGRAM_TEXT} strokeWidth="2.25" />
        <text x="320" y="112" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">AC</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <path d="M 80 150 Q 170 175 230 150 Q 300 118 360 40" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.25" />
        <text x="338" y="48" fontSize="10" fill={DIAGRAM_STROKE} fontWeight="600">MC</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <circle cx="232" cy="150" r="4" fill="var(--ink, var(--ec-brand))" />
        <text x="96" y="214" fontSize="9" fill={DIAGRAM_TEXT}>MC cuts AC at its minimum — lowest average cost.</text>
      </g>
    </svg>
  )
}
