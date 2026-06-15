'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '2-2-logarithmic-and-exponential-functions'

export function LogExpDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const ox = 60
  const oy = 170

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Exponential and logarithmic functions">
      <line x1={ox} y1={oy} x2={380} y2={oy} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1={ox} y1={oy} x2={ox} y2={30} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <path d={`M ${ox + 10} ${oy - 10} Q ${ox + 120} ${oy - 130} ${ox + 300} ${oy - 145}`} fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
        <text x="48" y="40" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">y = aˣ (a &gt; 0)</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <path d={`M ${ox + 20} ${oy - 140} Q ${ox + 140} ${oy - 40} ${ox + 300} ${oy - 8}`} fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" strokeDasharray="6 4" />
        <text x="260" y="60" fontSize="10" fill={DIAGRAM_TEXT}>y = log_a(x) — inverse of aˣ</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <line x1={ox + 20} y1={oy - 20} x2={ox + 280} y2={oy - 120} stroke={DIAGRAM_STROKE} strokeWidth="1" strokeDasharray="4 4" />
        <text x="260" y="100" fontSize="10" fill={DIAGRAM_TEXT}>Reflect in y = x for inverses</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="48" y="200" fontSize="10" fill={DIAGRAM_TEXT}>ln x and eˣ · log laws: log(ab) = log a + log b</text>
      </g>
    </svg>
  )
}
