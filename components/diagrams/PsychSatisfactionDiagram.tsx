'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '4-5-1-theories-of-job-satisfaction'

/** Herzberg's two-factor theory of job satisfaction. */
export function PsychSatisfactionDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Herzberg two-factor theory of job satisfaction">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="30" y="44" width="170" height="120" rx="10" fill="var(--ink, var(--ec-brand))" fillOpacity="0.1" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="115" y="66" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Motivators</text>
        <text x="115" y="86" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>achievement, recognition,</text>
        <text x="115" y="98" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>responsibility</text>
        <text x="115" y="150" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT} fontWeight="600">→ satisfaction</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="220" y="44" width="170" height="120" rx="10" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="305" y="66" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Hygiene factors</text>
        <text x="305" y="86" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>pay, conditions,</text>
        <text x="305" y="98" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>supervision</text>
        <text x="305" y="150" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT} fontWeight="600">→ prevent dissatisfaction</text>
      </g>
      <text x="40" y="196" fontSize="9" fill={DIAGRAM_TEXT}>Fixing hygiene factors removes unhappiness; motivators drive satisfaction.</text>
    </svg>
  )
}
