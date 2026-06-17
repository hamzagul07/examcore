'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '4-1-education'
const FACTORS = ['Social class', 'Gender', 'Ethnicity']

/** Social factors shaping educational attainment and inequality. */
export function SocEducationDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Factors shaping educational attainment">
      <defs>
        <marker id="soc-edu-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {FACTORS.map((f, i) => (
          <g key={f}>
            <rect x="30" y={48 + i * 44} width="130" height="34" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <text x="95" y={69 + i * 44} textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>{f}</text>
            <line x1="160" y1={65 + i * 44} x2="252" y2="108" stroke={DIAGRAM_STROKE} strokeWidth="1.5" markerEnd="url(#soc-edu-arrow)" />
          </g>
        ))}
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="256" y="84" width="134" height="48" rx="8" fill="var(--ink, var(--ec-brand))" fillOpacity="0.12" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="323" y="105" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">Attainment</text>
        <text x="323" y="120" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>gap</text>
      </g>
      <text x="40" y="206" fontSize="9" fill={DIAGRAM_TEXT}>Does education promote meritocracy or reproduce inequality?</text>
    </svg>
  )
}
