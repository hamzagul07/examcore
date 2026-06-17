'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '6-2-protectionism'

/** World price, imports, and the effect of a tariff on a domestic market. */
export function EconTradeDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Effect of a tariff on imports in a domestic market">
      <line x1="56" y1="190" x2="392" y2="190" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1="56" y1="190" x2="56" y2="28" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="40" y="34" fontSize="10" fill={DIAGRAM_TEXT}>P</text>
      <text x="388" y="206" fontSize="10" fill={DIAGRAM_TEXT}>Q</text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line x1="70" y1="50" x2="370" y2="185" stroke={DIAGRAM_TEXT} strokeWidth="2" />
        <text x="346" y="178" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">D</text>
        <line x1="70" y1="180" x2="370" y2="55" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="346" y="62" fontSize="10" fill={DIAGRAM_STROKE} fontWeight="600">S</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1="56" y1="150" x2="392" y2="150" stroke={DIAGRAM_TEXT} strokeWidth="1.75" strokeDasharray="6 4" />
        <text x="300" y="146" fontSize="9" fill={DIAGRAM_TEXT}>World price</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <line x1="56" y1="120" x2="392" y2="120" stroke="var(--ink, var(--ec-brand))" strokeWidth="1.75" strokeDasharray="6 4" />
        <text x="270" y="116" fontSize="9" fill={DIAGRAM_TEXT}>World price + tariff</text>
        <text x="92" y="216" fontSize="9" fill={DIAGRAM_TEXT}>A tariff raises price, cuts imports, aids domestic firms.</text>
      </g>
    </svg>
  )
}
