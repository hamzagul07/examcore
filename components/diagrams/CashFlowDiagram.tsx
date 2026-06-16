'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '5-5-1-the-meaning-and-purpose-of-budgets'

/** Cash flow forecast, budgets, and working capital cycle. */
export function CashFlowDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const months = ['Jan', 'Feb', 'Mar', 'Apr']
  const inflow = [40, 52, 48, 60]
  const outflow = [36, 44, 50, 42]

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Cash flow and budget diagram"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="210" y="28" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Cash inflows vs outflows
        </text>
        {months.map((m, i) => (
          <g key={m}>
            <rect x={56 + i * 80} y={170 - inflow[i]} width={24} height={inflow[i]} fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <rect x={84 + i * 80} y={170 - outflow[i]} width={24} height={outflow[i]} fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" opacity="0.65" />
            <text x={92 + i * 80} y="188" textAnchor="middle" fontSize="7" fill={DIAGRAM_TEXT}>
              {m}
            </text>
          </g>
        ))}
        <text x="48" y="48" fontSize="8" fill={DIAGRAM_TEXT}>
          In
        </text>
        <text x="48" y="60" fontSize="8" fill={DIAGRAM_TEXT}>
          Out
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <polyline points="56,140 136,120 216,128 296,100 376,88" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="210" y="108" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Net cash position over time
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <rect x="120" y="48" width="180" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="70" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Budget vs actual — favourable / adverse variance
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="200" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Working capital = current assets − current liabilities
        </text>
      </g>
    </svg>
  )
}
