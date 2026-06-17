'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '3-4-1-sources-of-stress'

/** General Adaptation Syndrome — alarm, resistance, exhaustion over time. */
export function PsychStressDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="General Adaptation Syndrome stress response">
      <line x1="56" y1="186" x2="384" y2="186" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1="56" y1="186" x2="56" y2="34" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="18" y="44" fontSize="8" fill={DIAGRAM_TEXT} transform="rotate(-90 18 44)">Resistance</text>
      <text x="350" y="202" fontSize="8" fill={DIAGRAM_TEXT}>Time</text>
      <line x1="56" y1="120" x2="384" y2="120" stroke={DIAGRAM_TEXT} strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
      <text x="300" y="116" fontSize="7.5" fill={DIAGRAM_TEXT}>normal level</text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <path d="M 70 110 L 110 150 L 150 90" fill="none" stroke="var(--ink, var(--ec-brand))" strokeWidth="2.5" />
        <text x="104" y="172" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>Alarm</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <path d="M 150 90 L 280 86" fill="none" stroke="var(--ink, var(--ec-brand))" strokeWidth="2.5" />
        <text x="215" y="78" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>Resistance</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <path d="M 280 86 L 372 168" fill="none" stroke="var(--ink, var(--ec-brand))" strokeWidth="2.5" />
        <text x="332" y="150" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>Exhaustion</text>
      </g>
      <text x="60" y="214" fontSize="9" fill={DIAGRAM_TEXT}>Prolonged stress depletes resources and harms health.</text>
    </svg>
  )
}
