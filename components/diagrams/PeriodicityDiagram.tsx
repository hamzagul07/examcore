'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '9-1-periodicity-of-physical-properties-of-the-elements-in-period-3'

/** Period 3 trends for 9701 topics 9.1 and 9.2. */
export function PeriodicityDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const isChemical = lessonSlug.includes('9-2')
  const elements = ['Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar']

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Period 3 periodic trends in physical and chemical properties"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Period 3 — {isChemical ? 'chemical properties' : 'physical properties'}
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {elements.map((el, i) => (
          <text key={el} x={68 + i * 38} y="72" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="700">
            {el}
          </text>
        ))}
        <line x1="60" y1="80" x2="360" y2="80" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          {isChemical
            ? 'Oxides: basic (Na, Mg) → amphoteric (Al) → acidic (Si–S)'
            : 'Atomic radius ↓ across period — nuclear charge increases'}
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        {!isChemical ? (
          <>
            <path d="M 70 130 Q 140 110 210 105 T 350 95" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
            <text x="210" y="148" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
              First IE rises — dips at Group 13 and 16
            </text>
          </>
        ) : (
          <text x="210" y="130" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
            Na₂O + H₂O → NaOH · SO₃ + H₂O → H₂SO₄
          </text>
        )}
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="130" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          {isChemical
            ? 'Chlorides: NaCl neutral · AlCl₃/SiCl₄ hydrolyse → acidic'
            : 'Melting point peaks at Si (giant covalent) — conductivity ↓ to non-metals'}
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="60" y="148" width="300" height="52" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="168" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          {isChemical ? 'Max oxidation state to Group 15 then falls' : 'Link trends to bonding type and structure'}
        </text>
        <text x="210" y="186" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Paper 2 — explain with nuclear charge, radius, and shielding
        </text>
      </g>
    </svg>
  )
}
