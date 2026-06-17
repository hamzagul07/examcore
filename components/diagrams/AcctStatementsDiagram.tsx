'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-3-1-capital-and-revenue-income-and-expenditure'

/** The two core financial statements and how profit links them. */
export function AcctStatementsDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Income statement and statement of financial position">
      <defs>
        <marker id="acct-st-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="34" y="46" width="150" height="92" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="109" y="66" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">Income statement</text>
        <text x="50" y="88" fontSize="8" fill={DIAGRAM_TEXT}>Revenue</text>
        <text x="50" y="104" fontSize="8" fill={DIAGRAM_TEXT}>− Expenses</text>
        <text x="50" y="124" fontSize="8.5" fill={DIAGRAM_TEXT} fontWeight="600">= Profit for the year</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1="184" y1="92" x2="234" y2="92" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#acct-st-arrow)" />
        <text x="209" y="84" textAnchor="middle" fontSize="7" fill={DIAGRAM_TEXT}>retained</text>
        <rect x="236" y="46" width="150" height="92" rx="8" fill="var(--ink, var(--ec-brand))" fillOpacity="0.1" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="311" y="66" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">Financial position</text>
        <text x="252" y="92" fontSize="8.5" fill={DIAGRAM_TEXT}>Assets</text>
        <text x="252" y="110" fontSize="8.5" fill={DIAGRAM_TEXT}>= Capital</text>
        <text x="252" y="126" fontSize="8.5" fill={DIAGRAM_TEXT}>+ Liabilities</text>
      </g>
      <text x="40" y="170" fontSize="9" fill={DIAGRAM_TEXT}>Profit raises capital; the balance sheet must always balance.</text>
    </svg>
  )
}
