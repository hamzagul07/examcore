'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '11-1-physical-properties-of-the-group-17-elements'

/** Halogens for 9701 topics 11.1 and 11.2. */
export function HalogenDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const isChemical = lessonSlug.includes('11-2')
  const halogens = ['F', 'Cl', 'Br', 'I']
  const colors = ['#e8e040', '#40a040', '#804020', '#404040']

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Group 17 halogens: physical trends and redox chemistry"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Group 17 — {isChemical ? 'chemical properties' : 'physical properties'}
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {halogens.map((x, i) => (
          <g key={x}>
            <circle cx={100 + i * 70} cy="88" r="18" fill={DIAGRAM_FILL} stroke={colors[i]} strokeWidth="3" />
            <text x={100 + i * 70} y="92" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="700">
              {x}
            </text>
            <text x={100 + i * 70} y="118" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
              {x}₂
            </text>
          </g>
        ))}
        <text x="210" y="140" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          {isChemical ? 'X₂ + 2e⁻ → 2X⁻ — oxidising power ↓ down group' : 'Colour darkens down group · b.p. ↑'}
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          {isChemical ? 'F₂ most reactive oxidising agent' : 'F–F bond anomalously weak (small atom repulsion)'}
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          {isChemical ? 'HX acid strength: HF < HCl < HBr < HI' : 'Stronger id–id forces → higher boiling points'}
        </text>
        <text x="210" y="122" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          {isChemical && 'HF weak acid — strong H-bonds in aqueous solution'}
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="138" width="280" height="52" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="158" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          {isChemical ? 'Cl₂ + 2OH⁻ → Cl⁻ + ClO⁻ + H₂O (cold dilute)' : 'Displacement: Cl₂ + 2I⁻ → I₂ + 2Cl⁻'}
        </text>
        <text x="210" y="176" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          More reactive halogen displaces less reactive halide
        </text>
      </g>
    </svg>
  )
}
