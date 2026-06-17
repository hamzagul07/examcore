'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-2-research-methods'

/** Experiment: manipulate the IV, measure the DV, hold controls constant. */
export function PsychResearchDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Experimental method: IV manipulated, DV measured, controls held">
      <defs>
        <marker id="psy-rm-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="40" y="74" width="120" height="48" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="100" y="95" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">IV</text>
        <text x="100" y="110" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>manipulated</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1="160" y1="98" x2="258" y2="98" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#psy-rm-arrow)" />
        <text x="208" y="90" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>causes?</text>
        <rect x="260" y="74" width="120" height="48" rx="8" fill="var(--ink, var(--ec-brand))" fillOpacity="0.12" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="320" y="95" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">DV</text>
        <text x="320" y="110" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>measured</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <rect x="120" y="150" width="180" height="30" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1" strokeDasharray="5 4" />
        <text x="210" y="169" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Controls held constant</text>
      </g>
      <text x="60" y="206" fontSize="9" fill={DIAGRAM_TEXT}>Control of variables lets us infer cause and effect.</text>
    </svg>
  )
}
