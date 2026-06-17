'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '5-2-1-business-ownership-and-sources-of-finance'

/** Sources of finance feed the business; revenue less costs gives profit. */
export function BizFinanceDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Sources of finance and the profit equation">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="40" y="44" width="150" height="30" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="115" y="63" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Internal: retained profit</text>
        <rect x="40" y="84" width="150" height="30" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="115" y="103" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>External: loans, shares</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1="190" y1="79" x2="248" y2="79" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <line x1="190" y1="99" x2="248" y2="79" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <rect x="248" y="58" width="128" height="44" rx="8" fill="var(--ink, var(--ec-brand))" fillOpacity="0.12" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="312" y="85" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Business</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <rect x="60" y="146" width="300" height="40" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="171" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">Profit = Revenue − Costs</text>
      </g>
      <text x="60" y="214" fontSize="9" fill={DIAGRAM_TEXT}>Match the source to cost, risk, and how long the funds are needed.</text>
    </svg>
  )
}
