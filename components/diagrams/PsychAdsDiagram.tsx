'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '2-3-advertising'
const STEPS = ['Attention', 'Interest', 'Desire', 'Action']

/** AIDA — how advertising moves an audience from attention to action. */
export function PsychAdsDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="AIDA advertising model: attention, interest, desire, action">
      <defs>
        <marker id="psy-ad-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      {STEPS.map((s, i) => (
        <g key={s} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <rect
            x={24 + i * 98}
            y="86"
            width="80"
            height="48"
            rx="8"
            fill={i === STEPS.length - 1 ? 'var(--ink, var(--ec-brand))' : DIAGRAM_FILL}
            fillOpacity={i === STEPS.length - 1 ? 0.12 : 1}
            stroke={DIAGRAM_STROKE}
            strokeWidth="1.5"
          />
          <text x={64 + i * 98} y="114" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">{s}</text>
          {i < STEPS.length - 1 && (
            <line x1={104 + i * 98} y1="110" x2={120 + i * 98} y2="110" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#psy-ad-arrow)" />
          )}
        </g>
      ))}
      <text x="70" y="172" fontSize="9" fill={DIAGRAM_TEXT}>Persuasion techniques carry the audience down the sequence.</text>
    </svg>
  )
}
