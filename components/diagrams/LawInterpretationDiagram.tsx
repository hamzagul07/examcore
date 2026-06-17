'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-3-1-statutory-interpretation'
const RULES = [
  { t: 'Literal', x: 30, y: 44 },
  { t: 'Golden', x: 220, y: 44 },
  { t: 'Mischief', x: 30, y: 120 },
  { t: 'Purposive', x: 220, y: 120 },
]

/** Four approaches a judge can take to interpret a statute. */
export function LawInterpretationDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Statutory interpretation rules">
      <text x="210" y="34" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Interpreting the statute</text>
      {RULES.map((r, i) => (
        <g key={r.t} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <rect x={r.x} y={r.y} width="170" height="60" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x={r.x + 85} y={r.y + 30} textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">{r.t} rule</text>
          <text x={r.x + 85} y={r.y + 46} textAnchor="middle" fontSize="7.5" fill={DIAGRAM_TEXT}>
            {['plain words', 'avoid absurdity', 'gap Parliament fixed', 'intended purpose'][i]}
          </text>
        </g>
      ))}
      <text x="60" y="214" fontSize="9" fill={DIAGRAM_TEXT}>Aids and presumptions guide the judge toward Parliament’s intention.</text>
    </svg>
  )
}
