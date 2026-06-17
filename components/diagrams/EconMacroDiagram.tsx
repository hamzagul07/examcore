'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '4-3-aggregate-demand-and-aggregate-supply-analysis'

/** AD–AS: macroeconomic equilibrium of price level and real output. */
export function EconMacroDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Aggregate demand and aggregate supply equilibrium">
      <line x1="56" y1="190" x2="392" y2="190" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1="56" y1="190" x2="56" y2="28" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="20" y="34" fontSize="9" fill={DIAGRAM_TEXT}>Price level</text>
      <text x="312" y="206" fontSize="9" fill={DIAGRAM_TEXT}>Real output (Y)</text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line x1="70" y1="50" x2="380" y2="185" stroke={DIAGRAM_TEXT} strokeWidth="2.25" />
        <text x="356" y="178" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">AD</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <path d="M 80 185 L 230 110 Q 320 60 330 32" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.25" />
        <text x="300" y="44" fontSize="10" fill={DIAGRAM_STROKE} fontWeight="600">AS</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <circle cx="214" cy="118" r="5" fill="var(--ink, var(--ec-brand))" />
        <line x1="214" y1="118" x2="56" y2="118" stroke={DIAGRAM_TEXT} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
        <line x1="214" y1="118" x2="214" y2="190" stroke={DIAGRAM_TEXT} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
        <text x="100" y="216" fontSize="9" fill={DIAGRAM_TEXT}>Equilibrium sets the price level and national output.</text>
      </g>
    </svg>
  )
}
