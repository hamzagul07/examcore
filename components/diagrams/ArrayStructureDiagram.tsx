'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '10-2-arrays'

export function ArrayStructureDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)
  return (
    <svg viewBox="0 0 420 200" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Arrays and list structures">
      <g opacity={layerOpacity(spec, stepIndex, 'array-1d')}>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <rect x={48 + i * 36} y={32} width={32} height={28} rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <text x={64 + i * 36} y={50} textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>{[4, 7, 2, 9, 1][i]}</text>
            <text x={64 + i * 36} y={72} textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>[{i}]</text>
          </g>
        ))}
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'array-2d')}>
        <text x="48" y="96" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">2D matrix — row-major nested loops</text>
        {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
          <rect key={`${r}-${c}`} x={48 + c * 28} y={104 + r * 24} width={24} height={20} rx="3" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1" />
        )))}
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'search')}>
        <text x="240" y="120" fontSize="10" fill={DIAGRAM_TEXT}>Linear O(n) vs binary O(log n)</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'stack-queue')}>
        <text x="48" y="184" fontSize="10" fill={DIAGRAM_TEXT}>Stack LIFO · Queue FIFO</text>
      </g>
    </svg>
  )
}
