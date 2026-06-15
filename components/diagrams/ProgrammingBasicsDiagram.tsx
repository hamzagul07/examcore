'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '11-1-programming-basics'

export function ProgrammingBasicsDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)
  return (
    <svg viewBox="0 0 420 200" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Programming basics">
      <g opacity={layerOpacity(spec, stepIndex, 'variables')}>
        <rect x="48" y="32" width="120" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="108" y="54" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>count ← 0</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'io')}>
        <text x="48" y="96" fontSize="10" fill={DIAGRAM_TEXT}>INPUT age · OUTPUT "Hello"</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'operators')}>
        <text x="48" y="124" fontSize="10" fill={DIAGRAM_TEXT}>MOD · DIV · AND · OR · NOT · &lt; &gt; =</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'comments')}>
        <text x="48" y="156" fontSize="10" fill={DIAGRAM_TEXT} fontStyle="italic">// comment — not executed</text>
      </g>
    </svg>
  )
}
