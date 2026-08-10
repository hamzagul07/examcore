'use client'

import {
  DIAGRAM_DEMAND,
  DIAGRAM_EQUILIBRIUM,
  DIAGRAM_GROWTH,
  DIAGRAM_SUPPLY,
  DIAGRAM_TEXT,
} from '@/components/diagrams/diagram-styles'
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
    <svg
      viewBox="0 0 420 240"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Circular flow of income between households and firms"
    >
      <defs>
        <marker id="ecf-arrow-spend" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_DEMAND} />
        </marker>
        <marker id="ecf-arrow-income" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_SUPPLY} />
        </marker>
      </defs>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect
          x="40"
          y="92"
          width="116"
          height="56"
          rx="10"
          fill="#e8eefc"
          stroke={DIAGRAM_DEMAND}
          strokeWidth="2"
        />
        <text x="98" y="124" textAnchor="middle" fontSize="12" fill={DIAGRAM_DEMAND} fontWeight="700">
          Households
        </text>
        <rect
          x="264"
          y="92"
          width="116"
          height="56"
          rx="10"
          fill="#fce8de"
          stroke={DIAGRAM_SUPPLY}
          strokeWidth="2"
        />
        <text x="322" y="124" textAnchor="middle" fontSize="12" fill={DIAGRAM_SUPPLY} fontWeight="700">
          Firms
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <path
          d="M 156 108 Q 210 78 264 108"
          fill="none"
          stroke={DIAGRAM_DEMAND}
          strokeWidth="2.5"
          markerEnd="url(#ecf-arrow-spend)"
        />
        <text x="210" y="72" textAnchor="middle" fontSize="10" fill={DIAGRAM_DEMAND} fontWeight="600">
          Spending on goods
        </text>
        <path
          d="M 264 132 Q 210 162 156 132"
          fill="none"
          stroke={DIAGRAM_SUPPLY}
          strokeWidth="2.5"
          markerEnd="url(#ecf-arrow-income)"
        />
        <text x="210" y="180" textAnchor="middle" fontSize="10" fill={DIAGRAM_SUPPLY} fontWeight="600">
          Income (wages, rent, profit)
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="56" y="40" fontSize="10" fill={DIAGRAM_GROWTH} fontWeight="700">
          Injections: investment, govt spending, exports
        </text>
        <text x="56" y="216" fontSize="10" fill={DIAGRAM_EQUILIBRIUM} fontWeight="700">
          Leakages: saving, taxation, imports
        </text>
        <text x="56" y="232" fontSize="9" fill={DIAGRAM_TEXT}>
          Injections &gt; leakages → national income rises.
        </text>
      </g>
    </svg>
  )
}
