'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '10-1-data-types-and-records'

export function DataTypesRecordDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)
  return (
    <svg viewBox="0 0 420 200" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Data types and records">
      <g opacity={layerOpacity(spec, stepIndex, 'atomic-types')}>
        <text x="48" y="28" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">INTEGER · REAL · CHAR · STRING · BOOLEAN · DATE</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'record')}>
        <rect x="48" y="44" width="180" height="72" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="138" y="64" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Student RECORD</text>
        <text x="60" y="84" fontSize="9" fill={DIAGRAM_TEXT}>Name : STRING</text>
        <text x="60" y="100" fontSize="9" fill={DIAGRAM_TEXT}>DOB : DATE</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'declare')}>
        <text x="48" y="136" fontSize="10" fill={DIAGRAM_TEXT}>DECLARE x ← 5  ·  strong typing</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'enum')}>
        <text x="48" y="164" fontSize="10" fill={DIAGRAM_TEXT}>DayType = (Mon, Tue, Wed, …)</text>
      </g>
    </svg>
  )
}
