'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '13-3-floating-point-numbers-representation-and-manipulation'

export function FloatingPointDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  return (
    <svg viewBox="0 0 420 200" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Floating-point binary representation">
      <g opacity={layerOpacity(spec, stepIndex, 'fields')}>
        <text x="48" y="28" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Sign | Mantissa | Exponent</text>
        {[1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1].map((b, i) => (
          <rect key={i} x={48 + i * 28} y={36} width={24} height={28} rx="3" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        ))}
        <text x="60" y="54" fontSize="9" fill={DIAGRAM_TEXT}>S</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'bias')}>
        <text x="48" y="88" fontSize="10" fill={DIAGRAM_TEXT}>Stored exponent = actual + bias</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'precision')}>
        <text x="48" y="116" fontSize="10" fill={DIAGRAM_TEXT}>0.1 + 0.2 ≠ 0.3 — rounding error</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'overflow')}>
        <text x="48" y="148" fontSize="10" fill={DIAGRAM_TEXT}>Underflow · Overflow · ±∞ · zero</text>
      </g>
    </svg>
  )
}
