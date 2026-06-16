'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getFamilyIdForSlug } from '@/lib/courses/diagram-families'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

function theoryView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const nodes = [
    { x: 210, y: 48, label: 'Functionalism' },
    { x: 72, y: 148, label: 'Conflict' },
    { x: 348, y: 148, label: 'Action / SI' },
  ]
  return (
    <>
      {nodes.map((n, i) => (
        <g key={n.label} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <circle cx={n.x} cy={n.y} r="36" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
            {n.label}
          </text>
        </g>
      ))}
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="196" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Compare perspectives on structure, agency, and social change
        </text>
      </g>
    </>
  )
}

function researchView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="48" y="56" width="120" height="72" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="108" y="88" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Quantitative
        </text>
        <text x="108" y="108" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Surveys · stats
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="252" y="56" width="120" height="72" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="312" y="88" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Qualitative
        </text>
        <text x="312" y="108" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Interviews · OBS
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="152" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Validity · reliability · ethics · representativeness
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="180" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Link method choice to research question and theoretical framework
        </text>
      </g>
    </>
  )
}

export function SocialScienceDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = '1-1-the-process-of-learning-and-socialisation',
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  const family = getFamilyIdForSlug(lessonSlug) ?? 'soc-theory'

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Sociology concept diagram"
    >
      {family === 'soc-research' ? researchView(spec, stepIndex) : theoryView(spec, stepIndex)}
    </svg>
  )
}
