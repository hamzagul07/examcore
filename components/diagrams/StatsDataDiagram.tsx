'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '5-1-representation-of-data'

export function StatsDataDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const bars = [48, 72, 90, 60, 40]

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Data representation: histograms and summary statistics">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {bars.map((h, i) => (
          <rect key={i} x={60 + i * 52} y={170 - h} width={40} height={h} fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        ))}
        <text x="210" y="24" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Histogram / grouped data</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1="120" y1="40" x2="120" y2="170" stroke={DIAGRAM_STROKE} strokeWidth="2" strokeDasharray="6 4" />
        <text x="128" y="50" fontSize="10" fill={DIAGRAM_TEXT}>mean x̄</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="260" y="80" fontSize="10" fill={DIAGRAM_TEXT}>Median, mode, range</text>
        <text x="260" y="98" fontSize="9" fill={DIAGRAM_TEXT}>Outliers affect mean more than median</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="48" y="200" fontSize="10" fill={DIAGRAM_TEXT}>Variance σ² and standard deviation σ — spread of data</text>
      </g>
    </svg>
  )
}
