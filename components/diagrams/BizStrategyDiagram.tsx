'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '6-2-1-developing-business-strategy'
const CELLS = [
  { t: 'Strengths', x: 70, y: 44 },
  { t: 'Weaknesses', x: 218, y: 44 },
  { t: 'Opportunities', x: 70, y: 120 },
  { t: 'Threats', x: 218, y: 120 },
]

/** SWOT analysis — internal vs external, helpful vs harmful. */
export function BizStrategyDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="SWOT analysis matrix">
      <text x="134" y="32" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Helpful</text>
      <text x="282" y="32" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Harmful</text>
      <text x="40" y="86" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT} transform="rotate(-90 40 86)">Internal</text>
      <text x="40" y="162" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT} transform="rotate(-90 40 162)">External</text>
      {CELLS.map((c, i) => (
        <g key={c.t} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <rect x={c.x} y={c.y} width="132" height="68" rx="8" fill={i < 2 ? DIAGRAM_FILL : 'var(--ink, var(--ec-brand))'} fillOpacity={i < 2 ? 1 : 0.1} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x={c.x + 66} y={c.y + 38} textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">{c.t}</text>
        </g>
      ))}
      <text x="70" y="226" fontSize="9" fill={DIAGRAM_TEXT}>Strategy builds on strengths to seize opportunities.</text>
    </svg>
  )
}
