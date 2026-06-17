'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '4-4-1-physical-work-conditions'
const FACTORS = ['Lighting & noise', 'Temperature', 'Shift patterns', 'Health & safety']

/** Physical and temporal work conditions shape performance and wellbeing. */
export function PsychWorkEnvDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Work conditions affecting performance and wellbeing">
      <defs>
        <marker id="psy-we-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {FACTORS.map((f, i) => (
          <g key={f}>
            <rect x="30" y={40 + i * 42} width="150" height="32" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <text x="105" y={60 + i * 42} textAnchor="middle" fontSize="8.5" fill={DIAGRAM_TEXT}>{f}</text>
            <line x1="180" y1={56 + i * 42} x2="252" y2="116" stroke={DIAGRAM_STROKE} strokeWidth="1.25" markerEnd="url(#psy-we-arrow)" />
          </g>
        ))}
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="256" y="92" width="134" height="50" rx="8" fill="var(--ink, var(--ec-brand))" fillOpacity="0.12" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="323" y="113" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">Performance</text>
        <text x="323" y="128" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>&amp; wellbeing</text>
      </g>
      <text x="40" y="214" fontSize="9" fill={DIAGRAM_TEXT}>Ergonomic, well-designed conditions raise output and reduce error.</text>
    </svg>
  )
}
