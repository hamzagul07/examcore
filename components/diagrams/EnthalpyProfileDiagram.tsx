'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '5-1-enthalpy-change-h'

/** Enthalpy changes and Hess cycles for 9701 topics 5.1 and 5.2. */
export function EnthalpyProfileDiagram({
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
      aria-label="Enthalpy profile: exothermic and endothermic reactions, Hess law cycles"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Enthalpy change ΔH at constant pressure
      </text>

      <line x1="60" y1="170" x2="360" y2="170" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="365" y="174" fontSize="11" fill={DIAGRAM_TEXT}>
        progress
      </text>
      <text x="48" y="100" fontSize="11" fill={DIAGRAM_TEXT} transform="rotate(-90 48 100)">
        H
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <path
          d="M 80 80 Q 160 40 240 80 T 360 120"
          fill="none"
          stroke={DIAGRAM_STROKE}
          strokeWidth="2.5"
        />
        <circle cx="80" cy="80" r="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <circle cx="360" cy="120" r="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <line x1="372" y1="80" x2="372" y2="120" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="382" y="104" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          ΔH
        </text>
        <text x="210" y="198" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          ΔH = H(products) − H(reactants)
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <path d="M 70 70 L 180 130" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="100" y="58" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Exo: ΔH &lt; 0
        </text>
        <path d="M 240 130 L 350 70" stroke={DIAGRAM_STROKE} strokeWidth="2" strokeDasharray="6 4" />
        <text x="280" y="58" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Endo: ΔH &gt; 0
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <rect x="118" y="44" width="184" height="36" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="66" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          ΔH⦵ — 298 K, 100 kPa, 1 mol
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="88" y="132" width="244" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="152" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Calorimetry: q = mcΔT
        </text>
        <text x="210" y="170" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Hess: total ΔH same for any route (5.2 cycles)
        </text>
      </g>
    </svg>
  )
}
