'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '18-1-artificial-intelligence-ai'

export function ExpertSystemDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)
  return (
    <svg viewBox="0 0 420 200" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Artificial intelligence and expert systems">
      <g opacity={layerOpacity(spec, stepIndex, 'ai-scope')}>
        <text x="48" y="28" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Narrow AI — task-specific intelligence</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'expert-system')}>
        <rect x="48" y="44" width="120" height="48" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="108" y="64" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Knowledge base</text>
        <rect x="200" y="44" width="120" height="48" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="260" y="64" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Inference engine</text>
        <line x1="168" y1="68" x2="200" y2="68" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'ml')}>
        <text x="48" y="120" fontSize="10" fill={DIAGRAM_TEXT}>ML: train on labelled data — supervised / unsupervised</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'ethics')}>
        <text x="48" y="152" fontSize="10" fill={DIAGRAM_TEXT}>Bias · transparency · accountability</text>
      </g>
    </svg>
  )
}
