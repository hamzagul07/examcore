'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-6-series'

export function SeriesDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Series, binomial expansion, and summation">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="48" y="40" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Arithmetic series</text>
        <text x="48" y="58" fontSize="10" fill={DIAGRAM_TEXT}>a, a+d, a+2d, … · Sₙ = n/2[2a + (n−1)d]</text>
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={48 + i * 44} y={68} width={36} height={36} rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        ))}
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="48" y="130" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Geometric series</text>
        <text x="48" y="148" fontSize="10" fill={DIAGRAM_TEXT}>Sₙ = a(1 − rⁿ)/(1 − r) · |r| &lt; 1 → S∞ = a/(1 − r)</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="260" y="60" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Binomial (a + b)ⁿ</text>
        <text x="260" y="78" fontSize="9" fill={DIAGRAM_TEXT}>Coefficients from Pascal / nCr</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="48" y="190" fontSize="10" fill={DIAGRAM_TEXT}>Σ notation — sum of terms from r = 1 to n</text>
      </g>
    </svg>
  )
}
