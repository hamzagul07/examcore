'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '5-3-probability'

export function ProbabilityDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Probability: sample space, permutations, and combinations">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="80" y="50" width="260" height="120" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="210" y="40" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Sample space S</text>
        <circle cx="140" cy="100" r="36" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <circle cx="220" cy="120" r="40" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="140" y="104" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>A</text>
        <text x="220" y="124" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>B</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="48" y="190" fontSize="10" fill={DIAGRAM_TEXT}>P(A ∪ B) = P(A) + P(B) − P(A ∩ B)</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="260" y="190" fontSize="10" fill={DIAGRAM_TEXT}>nPr — order matters</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="48" y="210" fontSize="10" fill={DIAGRAM_TEXT}>nCr = nPr/r! — combinations, order ignored</text>
      </g>
    </svg>
  )
}
