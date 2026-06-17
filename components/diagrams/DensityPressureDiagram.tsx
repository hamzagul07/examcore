'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '4-3-density-and-pressure'

/** Pressure in a fluid increases with depth: p = ρgh. */
export function DensityPressureDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Pressure in a fluid increases with depth">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="70" y="44" width="170" height="160" rx="4" fill="var(--ink, var(--ec-brand))" fillOpacity="0.08" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="155" y="38" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>fluid, density ρ</text>
        <line x1="252" y1="44" x2="252" y2="204" stroke={DIAGRAM_STROKE} strokeWidth="1" strokeDasharray="3 3" />
        <line x1="248" y1="44" x2="256" y2="44" stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
        <line x1="248" y1="204" x2="256" y2="204" stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
        <text x="266" y="128" fontSize="10" fill={DIAGRAM_TEXT}>depth h</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        {[70, 110, 150, 190].map((y, i) => (
          <line key={y} x1="86" y1={y} x2={86 + (i + 1) * 26} y2={y} stroke={DIAGRAM_STROKE} strokeWidth={1 + i * 0.6} markerEnd="" />
        ))}
        <text x="92" y="62" fontSize="8" fill={DIAGRAM_TEXT}>pressure grows with depth</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="300" y="170" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="600">p = ρgh</text>
        <text x="300" y="192" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>ρ = m / V</text>
      </g>
      <text x="60" y="226" fontSize="9" fill={DIAGRAM_TEXT}>Pressure = force per unit area; in a fluid it rises with depth.</text>
    </svg>
  )
}
