'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-5-trigonometry'

export function TrigonometryCircleDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const cx = 160
  const cy = 110
  const r = 70

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Unit circle, radians, and trigonometric ratios">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <line x1={cx - r - 10} y1={cy} x2={cx + r + 30} y2={cy} stroke={DIAGRAM_STROKE} strokeWidth="1" />
        <line x1={cx} y1={cy + r + 10} x2={cx} y2={cy - r - 20} stroke={DIAGRAM_STROKE} strokeWidth="1" />
        <text x={cx + r + 36} y={cy + 4} fontSize="10" fill={DIAGRAM_TEXT}>cos θ</text>
        <text x={cx - 8} y={cy - r - 24} fontSize="10" fill={DIAGRAM_TEXT}>sin θ</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1={cx} y1={cy} x2={cx + 55} y2={cy - 48} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="280" y="80" fontSize="10" fill={DIAGRAM_TEXT}>sin θ = opp/hyp</text>
        <text x="280" y="98" fontSize="10" fill={DIAGRAM_TEXT}>cos θ = adj/hyp</text>
        <text x="280" y="116" fontSize="10" fill={DIAGRAM_TEXT}>tan θ = sin θ/cos θ</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="280" y="148" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Radians: s = rθ</text>
        <text x="280" y="166" fontSize="9" fill={DIAGRAM_TEXT}>π rad = 180° · arc length on circle</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="48" y="200" fontSize="10" fill={DIAGRAM_TEXT}>Identities: sin²θ + cos²θ = 1</text>
      </g>
    </svg>
  )
}
