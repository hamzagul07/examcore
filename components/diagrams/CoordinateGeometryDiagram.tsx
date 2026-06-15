'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-3-coordinate-geometry'

export function CoordinateGeometryDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const ox = 60
  const oy = 170

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Coordinate geometry: lines, distance, and midpoint">
      <line x1={ox} y1={oy} x2={380} y2={oy} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1={ox} y1={oy} x2={ox} y2={30} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line x1={ox + 40} y1={oy - 20} x2={ox + 280} y2={oy - 120} stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
        <text x="48" y="48" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">y = mx + c</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <circle cx={ox + 80} cy={oy - 50} r="5" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <circle cx={ox + 240} cy={oy - 110} r="5" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <line x1={ox + 80} y1={oy - 50} x2={ox + 240} y2={oy - 110} stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="48" y="200" fontSize="10" fill={DIAGRAM_TEXT}>Distance = √[(x₂−x₁)² + (y₂−y₁)²]</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <circle cx={ox + 160} cy={oy - 80} r="5" fill={DIAGRAM_STROKE} />
        <text x={ox + 160} y={oy - 90} textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>midpoint</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="260" y="140" fontSize="10" fill={DIAGRAM_TEXT}>Parallel lines: equal gradient m</text>
        <text x="260" y="158" fontSize="10" fill={DIAGRAM_TEXT}>Perpendicular: m₁m₂ = −1</text>
      </g>
    </svg>
  )
}
