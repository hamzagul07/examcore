'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '3-6-intermolecular-forces-electronegativity-and-bond-properties'

/** IMF types for 9701 topic 3.6. */
export function IntermolecularForcesDiagram({
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
      aria-label="Intermolecular forces: van der Waals, dipole-dipole, and hydrogen bonding"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Intermolecular forces — weaker than covalent bonds
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <circle cx="150" cy="100" r="20" stroke={DIAGRAM_STROKE} strokeWidth="2" fill="none" className="eq-anim-force-cw" />
        <circle cx="270" cy="100" r="20" stroke={DIAGRAM_STROKE} strokeWidth="2" fill="none" className="eq-anim-force-cw" />
        <text x="210" y="140" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          id–id (instantaneous dipole — induced dipole) — all molecules
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <circle cx="150" cy="100" r="18" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="150" y="104" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          δ+
        </text>
        <circle cx="270" cy="100" r="18" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="270" y="104" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          δ−
        </text>
        <line x1="168" y1="100" x2="252" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="2" strokeDasharray="4 3" />
        <text x="210" y="140" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          pd–pd — permanent dipole attractions (polar molecules)
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="170" y="88" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="700">
          H
        </text>
        <line x1="170" y1="92" x2="170" y2="112" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="170" y="128" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="700">
          O
        </text>
        <line x1="170" y1="128" x2="230" y2="128" stroke={DIAGRAM_STROKE} strokeWidth="2" strokeDasharray="5 3" />
        <text x="240" y="132" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="700">
          H
        </text>
        <text x="210" y="158" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          H-bond: H attached to N, O, or F — strongest IMF
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="142" width="280" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="162" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Boiling point ↑ with IMF strength (similar Mr)
        </text>
        <text x="210" y="180" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          H₂O b.p. anomalously high — extensive H-bonding
        </text>
      </g>
    </svg>
  )
}
