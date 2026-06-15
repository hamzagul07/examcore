'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '2-6-numerical-solution-of-equations'

export function NumericalMethodsDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const ox = 60
  const oy = 170

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Numerical root-finding: sign change and iteration">
      <line x1={ox} y1={oy} x2={380} y2={oy} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1={ox} y1={oy} x2={ox} y2={30} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <path d={`M ${ox + 20} ${oy - 80} Q ${ox + 120} ${oy + 40} ${ox + 220} ${oy - 100} T ${ox + 300} ${oy + 20}`} fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
        <text x="48" y="40" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Locate root of f(x) = 0</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1={ox + 100} y1={oy} x2={ox + 100} y2={oy - 60} stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1={ox + 220} y1={oy} x2={ox + 220} y2={oy + 30} stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="260" y="80" fontSize="10" fill={DIAGRAM_TEXT}>Sign change → root in [a, b]</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="260" y="120" fontSize="10" fill={DIAGRAM_TEXT}>Iteration: xₙ₊₁ = g(xₙ)</text>
        <text x="260" y="138" fontSize="9" fill={DIAGRAM_TEXT}>Converges if |g&apos;(x)| &lt; 1 near root</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <circle cx={ox + 175} cy={oy - 12} r="5" fill={DIAGRAM_STROKE} />
        <text x="48" y="200" fontSize="10" fill={DIAGRAM_TEXT}>Newton–Raphson / bisection refine the estimate</text>
      </g>
    </svg>
  )
}
