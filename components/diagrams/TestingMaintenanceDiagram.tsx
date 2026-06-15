'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '12-3-program-testing-and-maintenance'

export function TestingMaintenanceDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)
  return (
    <svg viewBox="0 0 420 200" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Testing and maintenance">
      <g opacity={layerOpacity(spec, stepIndex, 'test-data')}>
        <text x="48" y="32" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Normal · Boundary · Erroneous data</text>
        <line x1="120" y1="48" x2="300" y2="48" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <circle cx="120" cy="48" r="5" fill={DIAGRAM_STROKE} />
        <circle cx="210" cy="48" r="5" fill={DIAGRAM_STROKE} />
        <circle cx="300" cy="48" r="5" fill={DIAGRAM_STROKE} />
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'stub')}>
        <rect x="48" y="72" width="100" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="98" y="96" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Module + stub</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'alpha-beta')}>
        <text x="200" y="96" fontSize="10" fill={DIAGRAM_TEXT}>Alpha (dev) → Beta (users)</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'maintenance')}>
        <text x="48" y="140" fontSize="9" fill={DIAGRAM_TEXT}>Corrective · Adaptive · Perfective · Preventive</text>
      </g>
    </svg>
  )
}
