'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '3-1-the-health-belief-model'
const BELIEFS = [
  { t: 'Susceptibility', y: 40 },
  { t: 'Severity', y: 76 },
  { t: 'Benefits', y: 112 },
  { t: 'Barriers', y: 148 },
]

/** Health Belief Model — beliefs predict the likelihood of health behaviour. */
export function PsychHealthDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Health Belief Model predicting health behaviour">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {BELIEFS.map((b) => (
          <g key={b.t}>
            <rect x="34" y={b.y} width="150" height="28" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <text x="109" y={b.y + 18} textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>{b.t}</text>
            <line x1="184" y1={b.y + 14} x2="250" y2="106" stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.4" />
          </g>
        ))}
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="250" y="84" width="140" height="44" rx="8" fill="var(--ink, var(--ec-brand))" fillOpacity="0.12" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="320" y="103" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">Likelihood</text>
        <text x="320" y="118" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">of action</text>
      </g>
      <text x="40" y="212" fontSize="9" fill={DIAGRAM_TEXT}>Perceived threat and cost–benefit balance drive behaviour change.</text>
    </svg>
  )
}
