'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '7-1-religion'

/** The secularisation debate — measured religiosity declining over time. */
export function SocReligionDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Secularisation: religiosity declining over time">
      <line x1="56" y1="186" x2="384" y2="186" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1="56" y1="186" x2="56" y2="34" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="20" y="44" fontSize="8" fill={DIAGRAM_TEXT} transform="rotate(-90 20 44)">Religiosity</text>
      <text x="350" y="202" fontSize="8" fill={DIAGRAM_TEXT}>Time</text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <path d="M 70 56 Q 180 70 250 120 T 372 168" fill="none" stroke="var(--ink, var(--ec-brand))" strokeWidth="2.5" />
        <text x="150" y="58" fontSize="9" fill={DIAGRAM_TEXT}>Church attendance, belief, practice</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="250" y="150" fontSize="9" fill={DIAGRAM_TEXT}>Secularisation thesis</text>
      </g>
      <text x="60" y="218" fontSize="9" fill={DIAGRAM_TEXT}>Debated: decline, or just changing forms of belief?</text>
    </svg>
  )
}
