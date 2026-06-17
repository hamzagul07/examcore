'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
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
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Production possibility curve">
      <line x1="56" y1="190" x2="392" y2="190" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1="56" y1="190" x2="56" y2="28" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="14" y="40" fontSize="9" fill={DIAGRAM_TEXT}>Capital</text>
      <text x="320" y="206" fontSize="9" fill={DIAGRAM_TEXT}>Consumer goods</text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <path d="M 56 44 Q 150 60 250 110 Q 320 150 368 190" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.25" />
        <text x="250" y="50" fontSize="9" fill={DIAGRAM_STROKE}>PPC frontier</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <circle cx="190" cy="150" r="4" fill={DIAGRAM_TEXT} />
        <text x="150" y="166" fontSize="8" fill={DIAGRAM_TEXT}>A · inefficient</text>
        <circle cx="240" cy="118" r="4" fill="var(--ink, var(--ec-brand))" />
        <text x="246" y="112" fontSize="8" fill={DIAGRAM_TEXT}>B · efficient</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="90" y="214" fontSize="9" fill={DIAGRAM_TEXT}>Moving along the curve has an opportunity cost.</text>
      </g>
    </svg>
  )
}
