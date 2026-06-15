'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '2-2-the-mole-and-the-avogadro-constant'

/** Moles, formulas, and reacting masses for 9701 topics 2.1–2.4. */
export function StoichiometryDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const mode = lessonSlug.includes('2-1')
    ? 'mass'
    : lessonSlug.includes('2-3')
      ? 'formula'
      : lessonSlug.includes('2-4')
        ? 'reacting'
        : 'mole'

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Stoichiometry: relative masses, moles, formulas, and reacting quantities"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        {mode === 'mass' && 'Relative atomic and formula masses'}
        {mode === 'mole' && 'The mole and Avogadro constant'}
        {mode === 'formula' && 'Molecular and empirical formulas'}
        {mode === 'reacting' && 'Reacting masses, volumes, and solutions'}
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {mode === 'formula' ? (
          <>
            <text x="210" y="100" textAnchor="middle" fontSize="14" fill={DIAGRAM_TEXT} fontWeight="700">
              C₂H₄O₂ vs CH₂O
            </text>
            <text x="210" y="128" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
              molecular vs empirical formula
            </text>
          </>
        ) : (
          <>
            <text x="210" y="96" textAnchor="middle" fontSize="16" fill={DIAGRAM_TEXT} fontWeight="700">
              {mode === 'mass' ? 'Mr(H₂O) = 18' : mode === 'reacting' ? 'n = m / Mr' : '6.02 × 10²³'}
            </text>
            <text x="210" y="124" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
              {mode === 'mass' ? 'Ar(Cl) = 35.5 (weighted mean of isotopes)' : mode === 'reacting' ? 'Use mole ratio from balanced equation' : '1 mol = Avogadro constant particles'}
            </text>
          </>
        )}
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="100" y="72" width="220" height="44" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="210" y="100" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">
          {mode === 'mole' && 'n = m / Mr'}
          {mode === 'mass' && 'Mr = Σ(Ar × subscripts)'}
          {mode === 'formula' && 'Coefficients balance atom counts'}
          {mode === 'reacting' && 'V(gas) = n × 24 dm³ at rtp'}
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          {mode === 'mole' && 'c = n / V  (mol dm⁻³) for solutions'}
          {mode === 'mass' && '¹²C isotope standard for relative masses'}
          {mode === 'formula' && 'Ionic compounds: formula units, not molecules'}
          {mode === 'reacting' && 'c = n / V — titration: n(acid) = n(alkali) at end point'}
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="138" width="280" height="52" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="158" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          {mode === 'reacting' ? 'Limiting reagent — runs out first' : 'Link Mr → moles → equation ratios'}
        </text>
        <text x="210" y="176" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Paper 2: show working with units and significant figures
        </text>
      </g>
    </svg>
  )
}
