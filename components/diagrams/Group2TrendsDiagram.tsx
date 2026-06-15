'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '10-1-similarities-and-trends-in-the-properties-of-the-group-2-metals-magnesium-to-barium-and-their-compounds'

/** Group 2 trends for 9701 topics 10.1 and 27.1. */
export function Group2TrendsDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const metals = ['Mg', 'Ca', 'Sr', 'Ba']

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Group 2 trends: reactivity, solubility, and thermal stability"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Group 2 — alkaline earth metals
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {metals.map((m, i) => (
          <g key={m}>
            <rect x={80 + i * 72} y="68" width="48" height="40" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
            <text x={104 + i * 72} y="94" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="700">
              {m}
            </text>
          </g>
        ))}
        <path d="M 90 120 L 330 120" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#g2-arr)" />
        <text x="210" y="140" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          Reactivity ↑ down group — easier to form M²⁺
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          M + 2H₂O → M(OH)₂ + H₂
        </text>
        <text x="210" y="122" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          M + 2HCl → MCl₂ + H₂
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          Thermal stability of CO₃²⁻ and NO₃⁻ ↓ down group
        </text>
        <text x="210" y="122" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Larger cation polarises anion less strongly
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="138" width="280" height="52" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="158" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          OH⁻ solubility ↑ down group · SO₄²⁻ solubility ↓
        </text>
        <text x="210" y="176" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          BaSO₄ insoluble — barium meal · sulfate test
        </text>
      </g>

      <defs>
        <marker id="g2-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
