'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '12-1-program-development-life-cycle'

export function SdlcDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)
  return (
    <svg viewBox="0 0 420 200" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Software development life cycle">
      <g opacity={layerOpacity(spec, stepIndex, 'analysis')}>
        <rect x="36" y="48" width="80" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="76" y="70" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Analysis</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'design')}>
        <rect x="132" y="48" width="80" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="172" y="70" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Design</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'implementation')}>
        <rect x="228" y="48" width="80" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="268" y="70" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Code</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'testing')}>
        <rect x="324" y="48" width="60" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="354" y="70" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Test</text>
        <path d="M 384 66 L 404 66 L 404 120 L 76 120 L 76 84" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="140" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Maintenance loop — Agile or Waterfall</text>
      </g>
    </svg>
  )
}
