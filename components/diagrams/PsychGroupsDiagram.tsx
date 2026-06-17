'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '4-3-1-group-development-and-decision-making'
const STAGES = ['Forming', 'Storming', 'Norming', 'Performing']

/** Tuckman's stages of group development. */
export function PsychGroupsDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Tuckman's stages of group development">
      <defs>
        <marker id="psy-grp-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      {STAGES.map((s, i) => (
        <g key={s} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <rect x={20 + i * 98} y="92" width="82" height="46" rx="8" fill={i === STAGES.length - 1 ? 'var(--ink, var(--ec-brand))' : DIAGRAM_FILL} fillOpacity={i === STAGES.length - 1 ? 0.12 : 1} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x={61 + i * 98} y="119" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">{s}</text>
          {i < STAGES.length - 1 && (
            <line x1={102 + i * 98} y1="115" x2={118 + i * 98} y2="115" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#psy-grp-arrow)" />
          )}
        </g>
      ))}
      <text x="60" y="170" fontSize="9" fill={DIAGRAM_TEXT}>Groups mature through stages before performing effectively.</text>
    </svg>
  )
}
