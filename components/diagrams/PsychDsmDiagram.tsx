'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-1-1-diagnostic-criteria-for-schizophrenia'
const CRITERIA = ['Symptoms', 'Duration', 'Distress', 'Function']

/** Diagnostic criteria checklist feeding a DSM/ICD classification. */
export function PsychDsmDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Diagnostic criteria checklist for classification">
      <text x="210" y="34" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Diagnostic criteria checklist</text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {CRITERIA.map((c, i) => (
          <g key={c}>
            <rect x={28 + i * 94} y="56" width="82" height="34" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <text x={69 + i * 94} y="77" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>{c}</text>
          </g>
        ))}
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        {CRITERIA.map((c, i) => (
          <line key={`a-${c}`} x1={69 + i * 94} y1="90" x2="210" y2="130" stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.4" />
        ))}
        <rect x="120" y="130" width="180" height="40" rx="8" fill="var(--ink, var(--ec-brand))" fillOpacity="0.12" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="155" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">DSM-5 / ICD-11 diagnosis</text>
      </g>
      <text x="70" y="200" fontSize="9" fill={DIAGRAM_TEXT}>Reliable diagnosis needs agreed, observable criteria.</text>
    </svg>
  )
}
