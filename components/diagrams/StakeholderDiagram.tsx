'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-5-1-business-stakeholders'

function quadrant(x: number, y: number, label: string, sub: string) {
  return (
    <g>
      <rect x={x} y={y} width="148" height="64" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x={x + 74} y={y + 28} textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
        {label}
      </text>
      <text x={x + 74} y={y + 46} textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
        {sub}
      </text>
    </g>
  )
}

/** Mendelow stakeholder matrix — power vs interest. */
export function StakeholderDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Stakeholder analysis matrix"
    >
      <text x="24" y="108" fontSize="9" fill={DIAGRAM_TEXT} transform="rotate(-90 24 108)">
        Interest
      </text>
      <text x="210" y="212" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
        Power / influence
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {quadrant(48, 36, 'Minimal effort', 'Low power · low interest')}
        <text x="210" y="24" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Mendelow matrix
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        {quadrant(224, 36, 'Keep informed', 'Low power · high interest')}
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        {quadrant(48, 112, 'Keep satisfied', 'High power · low interest')}
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        {quadrant(224, 112, 'Key players', 'High power · high interest')}
        <text x="210" y="196" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Match strategy to stakeholder group — owners, employees, customers, community
        </text>
      </g>

      <line x1="136" y1="36" x2="136" y2="176" stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.4" />
      <line x1="48" y1="104" x2="372" y2="104" stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.4" />
    </svg>
  )
}
