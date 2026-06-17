'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-1-3-treatment-and-management-of-schizophrenia'
const APPROACHES = [
  { t: 'Biological', s: 'drugs', x: 26 },
  { t: 'Psychological', s: 'CBT', x: 162 },
  { t: 'Social', s: 'support', x: 298 },
]

/** Biopsychosocial treatment — three approaches converge on recovery. */
export function PsychTreatmentDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Biopsychosocial treatment approaches">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {APPROACHES.map((a) => (
          <g key={a.t}>
            <rect x={a.x} y="48" width="96" height="46" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <text x={a.x + 48} y="70" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">{a.t}</text>
            <text x={a.x + 48} y="85" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>{a.s}</text>
            <line x1={a.x + 48} y1="94" x2="210" y2="138" stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.4" />
          </g>
        ))}
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="128" y="138" width="164" height="42" rx="8" fill="var(--ink, var(--ec-brand))" fillOpacity="0.12" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="164" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Recovery &amp; management</text>
      </g>
      <text x="60" y="206" fontSize="9" fill={DIAGRAM_TEXT}>Combined approaches outperform any single treatment.</text>
    </svg>
  )
}
