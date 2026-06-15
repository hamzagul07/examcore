'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '10-3-files'

export function FileAccessDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)
  return (
    <svg viewBox="0 0 420 200" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="File organisation and access">
      <g opacity={layerOpacity(spec, stepIndex, 'sequential')}>
        <text x="48" y="28" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Sequential access</text>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={48 + i * 44} y={36} width={40} height={24} rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        ))}
        <line x1="88" y1="48" x2="92" y2="48" stroke={DIAGRAM_STROKE} strokeWidth="1.5" markerEnd="url(#fa)" />
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'random')}>
        <text x="48" y="88" fontSize="10" fill={DIAGRAM_TEXT}>Random access — index maps key → offset</text>
        <line x1="200" y1="100" x2="320" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="4 3" />
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'lifecycle')}>
        <text x="48" y="124" fontSize="10" fill={DIAGRAM_TEXT}>OPEN → READ/WRITE → CLOSE</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'exceptions')}>
        <text x="48" y="156" fontSize="10" fill={DIAGRAM_TEXT}>Handle EOF and missing file errors</text>
      </g>
      <defs><marker id="fa" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><polygon points="0,0 6,3 0,6" fill={DIAGRAM_STROKE} /></marker></defs>
    </svg>
  )
}
