'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-2-functions'

export function FunctionGraphDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Functions, domain, range, and composition">
      <line x1="60" y1="170" x2="380" y2="170" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1="60" y1="170" x2="60" y2="30" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <path d="M 80 150 Q 160 40 240 90 T 360 60" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="210" y="24" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">y = f(x)</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="260" y="100" width="130" height="56" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="325" y="122" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Domain → Range</text>
        <text x="325" y="140" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Input x, output f(x)</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="48" y="196" fontSize="10" fill={DIAGRAM_TEXT}>Composite: f(g(x)) — apply g first, then f</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <path d="M 80 120 Q 200 200 320 80" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" strokeDasharray="6 4" />
        <text x="48" y="148" fontSize="10" fill={DIAGRAM_TEXT}>Inverse: reflect in y = x</text>
      </g>
    </svg>
  )
}
