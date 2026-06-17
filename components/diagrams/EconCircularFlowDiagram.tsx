'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '4-2-introduction-to-the-circular-flow-of-income'

/** Circular flow of income between households and firms, with injections/leakages. */
export function EconCircularFlowDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Circular flow of income between households and firms">
      <defs>
        <marker id="ecf-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="40" y="92" width="116" height="56" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="98" y="124" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Households</text>
        <rect x="264" y="92" width="116" height="56" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="322" y="124" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Firms</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <path d="M 156 108 Q 210 78 264 108" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#ecf-arrow)" />
        <text x="210" y="74" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Spending on goods</text>
        <path d="M 264 132 Q 210 162 156 132" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#ecf-arrow)" />
        <text x="210" y="178" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Income (wages, rent, profit)</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="60" y="40" fontSize="9" fill={DIAGRAM_TEXT}>Injections: investment, govt spending, exports</text>
        <text x="60" y="216" fontSize="9" fill={DIAGRAM_TEXT}>Leakages: saving, taxation, imports</text>
      </g>
    </svg>
  )
}
