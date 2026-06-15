'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '20-1-programming-paradigms'

export function ParadigmDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)
  return (
    <svg viewBox="0 0 420 200" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Programming paradigms">
      <g opacity={layerOpacity(spec, stepIndex, 'level')}>
        <text x="48" y="32" fontSize="10" fill={DIAGRAM_TEXT}>Machine code → Assembly → High-level HLL</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'procedural')}>
        <rect x="48" y="48" width="140" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="118" y="72" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Procedural — procedures</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'oop')}>
        <rect x="232" y="48" width="140" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="302" y="72" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>OOP — classes</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'declarative')}>
        <text x="48" y="120" fontSize="10" fill={DIAGRAM_TEXT}>Declarative — SQL, Prolog (state what, not how)</text>
      </g>
    </svg>
  )
}
