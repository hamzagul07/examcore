'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '3-3-1-the-elements-of-the-marketing-mix-the-4ps'
const PS = [
  { t: 'Product', x: 96, y: 56 },
  { t: 'Price', x: 280, y: 56 },
  { t: 'Place', x: 96, y: 150 },
  { t: 'Promotion', x: 280, y: 150 },
]

/** The marketing mix — the 4Ps balanced around the target market. */
export function BizMarketingMixDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Marketing mix: the 4Ps">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {PS.map((p) => (
          <line key={`l-${p.t}`} x1="210" y1="108" x2={p.x + 44} y2={p.y + 14} stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.4" />
        ))}
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        {PS.map((p) => (
          <g key={p.t}>
            <rect x={p.x} y={p.y} width="88" height="30" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <text x={p.x + 44} y={p.y + 19} textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">{p.t}</text>
          </g>
        ))}
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <circle cx="210" cy="108" r="34" fill="var(--ink, var(--ec-brand))" opacity="0.12" />
        <circle cx="210" cy="108" r="34" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="105" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">Target</text>
        <text x="210" y="118" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">market</text>
      </g>
      <text x="60" y="226" fontSize="9" fill={DIAGRAM_TEXT}>A coordinated mix wins the right customers profitably.</text>
    </svg>
  )
}
