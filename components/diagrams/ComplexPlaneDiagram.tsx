'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '3-9-complex-numbers'

export function ComplexPlaneDiagram({
  className = '',
  stepIndex = 0,
  params,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const re = params?.re ?? 3
  const im = params?.im ?? 2
  const ox = 80
  const oy = 150
  const scale = 22
  const px = ox + re * scale
  const py = oy - im * scale
  const mod = Math.sqrt(re * re + im * im)

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Argand diagram for complex numbers"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'axes')}>
        <line x1={ox} y1={oy} x2={360} y2={oy} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <line x1={ox} y1={oy} x2={ox} y2={24} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x={368} y={154} fontSize="10" fill={DIAGRAM_TEXT}>
          Re
        </text>
        <text x={68} y={32} fontSize="10" fill={DIAGRAM_TEXT}>
          Im
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'point')}>
        <line x1={ox} y1={oy} x2={px} y2={py} stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="4 3" />
        <circle cx={px} cy={py} r="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x={px + 10} y={py - 6} fontSize="10" fill={DIAGRAM_TEXT}>
          z = {re} + {im}i
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'modulus')}>
        <text x={48} y={188} fontSize="10" fill={DIAGRAM_TEXT}>
          |z| = √(x² + y²) ≈ {mod.toFixed(2)}
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'argument')}>
        <text x={220} y={188} fontSize="10" fill={DIAGRAM_TEXT}>
          arg(z) = tan⁻¹(y/x) · z* = {re} − {im}i
        </text>
      </g>
    </svg>
  )
}
