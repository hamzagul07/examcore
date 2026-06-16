'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-6-2-calculation-and-evaluation-of-ratios'

function bar(x: number, h: number, label: string) {
  return (
    <g>
      <rect x={x} y={170 - h} width={36} height={h} rx="3" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x={x + 18} y={184} textAnchor="middle" fontSize="7" fill={DIAGRAM_TEXT}>
        {label}
      </text>
    </g>
  )
}

/** Profitability, liquidity, efficiency, and gearing ratio summary chart. */
export function RatioAnalysisDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Financial ratio analysis diagram"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="120" y="28" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Liquidity
        </text>
        {bar(72, 64, 'CR')}
        {bar(120, 48, 'AT')}
        <text x="120" y="52" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Current · Acid test
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="300" y="28" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Profitability
        </text>
        {bar(252, 80, 'GP%')}
        {bar(300, 72, 'NP%')}
        {bar(348, 56, 'ROCE')}
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="108" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Efficiency &amp; activity
        </text>
        <rect x="100" y="118" width="220" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="140" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Inventory days · Receivables · Payables · Asset turnover
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="172" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Gearing &amp; interpretation
        </text>
        <text x="210" y="192" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Compare trends · industry benchmark · link ratio to user decision
        </text>
      </g>
    </svg>
  )
}
