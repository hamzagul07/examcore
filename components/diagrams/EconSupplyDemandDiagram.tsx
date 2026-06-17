'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '2-1-demand-and-supply-curves'

/** Demand and supply meeting at market equilibrium (P*, Q*). */
export function EconSupplyDemandDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  const ex = 228
  const ey = 119
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Supply and demand equilibrium">
      <line x1="56" y1="190" x2="392" y2="190" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1="56" y1="190" x2="56" y2="28" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="40" y="34" fontSize="10" fill={DIAGRAM_TEXT}>P</text>
      <text x="388" y="206" fontSize="10" fill={DIAGRAM_TEXT}>Q</text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line x1="70" y1="50" x2="380" y2="185" stroke={DIAGRAM_TEXT} strokeWidth="2.25" />
        <text x="356" y="178" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">D</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1="70" y1="185" x2="380" y2="55" stroke={DIAGRAM_STROKE} strokeWidth="2.25" />
        <text x="356" y="62" fontSize="10" fill={DIAGRAM_STROKE} fontWeight="600">S</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <circle cx={ex} cy={ey} r="5" fill="var(--ink, var(--ec-brand))" />
        <line x1={ex} y1={ey} x2={ex} y2="190" stroke={DIAGRAM_TEXT} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
        <line x1={ex} y1={ey} x2="56" y2={ey} stroke={DIAGRAM_TEXT} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
        <text x="40" y={ey + 4} fontSize="9" fill={DIAGRAM_TEXT}>P*</text>
        <text x={ex - 4} y="204" fontSize="9" fill={DIAGRAM_TEXT}>Q*</text>
        <text x="120" y="40" fontSize="9" fill={DIAGRAM_TEXT}>Equilibrium: Qd = Qs</text>
      </g>
    </svg>
  )
}
