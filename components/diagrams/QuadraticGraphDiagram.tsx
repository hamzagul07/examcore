'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-1-quadratics'

export function QuadraticGraphDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const ox = 60
  const oy = 170

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Quadratic graph and roots">
      <line x1={ox} y1={oy} x2={380} y2={oy} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1={ox} y1={oy} x2={ox} y2={30} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <path d={`M ${ox + 20} ${oy - 10} Q ${ox + 120} ${oy - 120} ${ox + 220} ${oy - 10} T ${ox + 320} ${oy + 80}`} fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
        <text x="210" y="24" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">y = ax² + bx + c</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <circle cx={ox + 170} cy={oy - 65} r="5" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x={ox + 170} y={oy - 75} textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>vertex (h, k)</text>
        <text x="48" y="200" fontSize="10" fill={DIAGRAM_TEXT}>y = a(x − h)² + k</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="260" y="140" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Δ = b² − 4ac</text>
        <text x="260" y="158" fontSize="9" fill={DIAGRAM_TEXT}>Δ &gt; 0 two roots · Δ = 0 one · Δ &lt; 0 none</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <circle cx={ox + 90} cy={oy} r="4" fill={DIAGRAM_STROKE} />
        <circle cx={ox + 250} cy={oy} r="4" fill={DIAGRAM_STROKE} />
        <text x="48" y="180" fontSize="10" fill={DIAGRAM_TEXT}>x-intercepts solve ax² + bx + c = 0</text>
      </g>
    </svg>
  )
}
