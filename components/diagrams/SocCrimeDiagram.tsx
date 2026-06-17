'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '8-1-crime-and-deviance'

/** The dark figure of crime — recorded crime is the tip of the iceberg. */
export function SocCrimeDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="The dark figure of crime iceberg">
      <line x1="40" y1="104" x2="380" y2="104" stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="6 4" />
      <text x="330" y="100" fontSize="8" fill={DIAGRAM_TEXT}>waterline</text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <polygon points="210,44 244,104 176,104" fill="var(--ink, var(--ec-brand))" fillOpacity="0.18" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="90" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>Recorded</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <polygon points="176,104 244,104 320,196 100,196" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="150" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">Dark figure of crime</text>
        <text x="210" y="166" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>unreported &amp; unrecorded</text>
      </g>
      <text x="60" y="216" fontSize="9" fill={DIAGRAM_TEXT}>Official statistics capture only a fraction of actual crime.</text>
    </svg>
  )
}
