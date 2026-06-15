'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-1-particles-in-the-atom-and-atomic-radius'

/** Protons, neutrons, electrons, and isotopes for 9701 topics 1.1 and 1.2. */
export function AtomicStructureDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const isIsotopes = lessonSlug.includes('1-2')

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Atomic structure: nucleus, subatomic particles, and isotopes"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        {isIsotopes ? 'Isotopes — same Z, different A' : 'Subatomic particles in the atom'}
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <circle cx="210" cy="108" r="36" fill="color-mix(in srgb, var(--ec-brand) 15%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
        <text x="200" y="104" fontSize="9" fill={DIAGRAM_TEXT}>
          p+
        </text>
        <text x="218" y="116" fontSize="9" fill={DIAGRAM_TEXT}>
          n
        </text>
        <circle cx="280" cy="78" r="5" fill={DIAGRAM_STROKE} />
        <circle cx="300" cy="108" r="5" fill={DIAGRAM_STROKE} />
        <circle cx="130" cy="118" r="5" fill={DIAGRAM_STROKE} />
        <circle cx="290" cy="138" r="5" fill={DIAGRAM_STROKE} />
        <text x="210" y="168" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          Nucleus (p⁺, n) + electrons in shells
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="110" y="88" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Z = {isIsotopes ? '6' : '11'}
        </text>
        <text x="110" y="106" fontSize="10" fill={DIAGRAM_TEXT}>
          protons
        </text>
        <text x="290" y="88" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          A = {isIsotopes ? '12 / 14' : '23'}
        </text>
        <text x="290" y="106" fontSize="10" fill={DIAGRAM_TEXT}>
          p + n
        </text>
        {isIsotopes && (
          <text x="210" y="188" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
            ¹²C and ¹⁴C — identical chemistry, different mass
          </text>
        )}
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <circle cx="160" cy="108" r="28" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="160" y="112" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="700">
          Na⁺
        </text>
        <circle cx="280" cy="108" r="28" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="280" y="112" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="700">
          Cl⁻
        </text>
        <text x="210" y="168" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          {isIsotopes ? 'Weighted mean Ar from isotope abundances' : 'Charge = protons − electrons'}
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="138" width="280" height="52" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="160" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          {isIsotopes ? 'Some isotopes radioactive — unstable n:p ratio' : 'Atomic radius ↓ across a period'}
        </text>
        <text x="210" y="178" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          {isIsotopes ? 'Ar = Σ(isotope mass × abundance) / 100' : 'Nuclear charge pulls electrons closer'}
        </text>
      </g>
    </svg>
  )
}
