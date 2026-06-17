'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '4-1-1-the-transformational-process'

/** Operations: inputs transformed into outputs, with value added. */
export function BizOperationsDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  const stages = [
    { t: 'Inputs', s: 'land · labour · capital', x: 26 },
    { t: 'Transformation', s: 'process · add value', x: 156 },
    { t: 'Outputs', s: 'goods · services', x: 290 },
  ]
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Operations transformation process: inputs to outputs">
      <defs>
        <marker id="biz-op-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      {stages.map((st, i) => (
        <g key={st.t} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <rect x={st.x} y="86" width="104" height="64" rx="8" fill={i === 1 ? 'var(--ink, var(--ec-brand))' : DIAGRAM_FILL} fillOpacity={i === 1 ? 0.12 : 1} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x={st.x + 52} y="114" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">{st.t}</text>
          <text x={st.x + 52} y="132" textAnchor="middle" fontSize="7.5" fill={DIAGRAM_TEXT}>{st.s}</text>
        </g>
      ))}
      <line x1="132" y1="118" x2="154" y2="118" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#biz-op-arrow)" />
      <line x1="262" y1="118" x2="288" y2="118" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#biz-op-arrow)" />
      <text x="60" y="204" fontSize="9" fill={DIAGRAM_TEXT}>Efficiency, quality, and capacity shape the cost per unit.</text>
    </svg>
  )
}
