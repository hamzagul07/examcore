'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '5-4-discrete-random-variables'

export function DiscreteDistributionDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const rows = [
    ['x', '0', '1', '2', '3'],
    ['P(X=x)', '0.1', '0.3', '0.4', '0.2'],
  ]

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Discrete probability distribution">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="48" y="36" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Probability distribution table</text>
        {rows.map((row, ri) =>
          row.map((cell, ci) => (
            <g key={`${ri}-${ci}`}>
              <rect x={48 + ci * 72} y={48 + ri * 32} width={68} height={28} fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
              <text x={48 + ci * 72 + 34} y={68 + ri * 32} textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight={ci === 0 ? 600 : 400}>
                {cell}
              </text>
            </g>
          ))
        )}
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="48" y="130" fontSize="10" fill={DIAGRAM_TEXT}>Σ P(X = x) = 1</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="48" y="152" fontSize="10" fill={DIAGRAM_TEXT}>E(X) = Σ x·P(X = x)</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="48" y="174" fontSize="10" fill={DIAGRAM_TEXT}>Var(X) = E(X²) − [E(X)]²</text>
      </g>
    </svg>
  )
}
