'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '7-1-1-the-relationship-between-business-objectives-and-organisational-structure'
const TEAM = [70, 178, 286]

/** Organisational hierarchy — chain of command and span of control. */
export function BizOrgStructureDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Organisational structure hierarchy">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="166" y="34" width="88" height="30" rx="6" fill="var(--ink, var(--ec-brand))" fillOpacity="0.12" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="53" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Directors</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1="210" y1="64" x2="210" y2="92" stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
        <line x1="110" y1="92" x2="310" y2="92" stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
        {[110, 310].map((x) => (
          <g key={x}>
            <line x1={x} y1="92" x2={x} y2="104" stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
            <rect x={x - 44} y="104" width="88" height="28" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <text x={x} y="122" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Manager</text>
          </g>
        ))}
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <line x1="66" y1="132" x2="354" y2="132" stroke={DIAGRAM_STROKE} strokeWidth="1.25" opacity="0.6" />
        {TEAM.map((x) => (
          <g key={x}>
            <line x1={x + 22} y1="132" x2={x + 22} y2="148" stroke={DIAGRAM_STROKE} strokeWidth="1.25" opacity="0.6" />
            <rect x={x} y="148" width="64" height="26" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
            <text x={x + 32} y="165" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>Team</text>
          </g>
        ))}
      </g>
      <text x="60" y="214" fontSize="9" fill={DIAGRAM_TEXT}>Levels of hierarchy set the chain of command and span of control.</text>
    </svg>
  )
}
