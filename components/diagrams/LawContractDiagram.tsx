'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '2-1-1-formation-of-contract'
const ELEMENTS = ['Offer', 'Acceptance', 'Consideration', 'Intention']

/** The four elements that together form a legally binding contract. */
export function LawContractDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Elements of a valid contract">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {ELEMENTS.map((e, i) => (
          <g key={e}>
            <rect x={20 + i * 98} y="54" width="84" height="38" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <text x={62 + i * 98} y="77" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>{e}</text>
            <line x1={62 + i * 98} y1="92" x2="210" y2="132" stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.4" />
          </g>
        ))}
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="120" y="132" width="180" height="42" rx="8" fill="var(--ink, var(--ec-brand))" fillOpacity="0.12" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="158" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Valid, binding contract</text>
      </g>
      <text x="50" y="204" fontSize="9" fill={DIAGRAM_TEXT}>Missing any element means there is no enforceable agreement.</text>
    </svg>
  )
}
