'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '7-2-br-nsted-lowry-theory-of-acids-and-bases'

/** Brønsted-Lowry acids and bases for 9701 topic 7.2. */
export function AcidsBasesDiagram({
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
      aria-label="Brønsted-Lowry theory: acids donate protons, bases accept protons"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Brønsted-Lowry — proton transfer
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="120" y="100" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="700">
          HA
        </text>
        <path d="M 150 100 L 190 100" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#ab-arr)" />
        <text x="170" y="88" fontSize="9" fill={DIAGRAM_TEXT}>
          H⁺
        </text>
        <text x="220" y="100" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="700">
          B
        </text>
        <text x="210" y="140" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          Acid donates H⁺ · Base accepts H⁺
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="110" y="92" fontSize="10" fill={DIAGRAM_TEXT}>
          HA ⇌ A⁻ + H⁺
        </text>
        <text x="280" y="92" fontSize="10" fill={DIAGRAM_TEXT}>
          strong → fully ionised
        </text>
        <text x="210" y="130" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          Weak acids: equilibrium lies left — Ka measures strength
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">
          pKa = −log Ka
        </text>
        <text x="210" y="130" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          Conjugate pairs: HA/A⁻ and BH⁺/B differ by one H⁺
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="90" y="142" width="240" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="162" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          pH = −log[H⁺]
        </text>
        <text x="210" y="180" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Strong acid: [H⁺] ≈ concentration · Weak: use Ka or ICE table
        </text>
      </g>

      <defs>
        <marker id="ab-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
