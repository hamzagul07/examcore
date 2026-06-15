'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '3-1-electronegativity-and-bonding'

/** Electronegativity trends and bond polarity for 9701 topic 3.1. */
export function ElectronegativityDiagram({
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
      aria-label="Electronegativity trends and polar covalent bonds"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Electronegativity (Pauling) — bond type from ΔEN
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="80" y="70" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          ↑ EN up period
        </text>
        <text x="340" y="70" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          F = 4.0
        </text>
        <line x1="100" y1="90" x2="320" y2="90" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        {['Li', 'C', 'N', 'O', 'F'].map((el, i) => (
          <text key={el} x={110 + i * 48} y="108" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="700">
            {el}
          </text>
        ))}
        <text x="210" y="130" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          EN ↓ down a group — valence electron farther from nucleus
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <circle cx="150" cy="158" r="16" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="150" y="162" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          δ+
        </text>
        <circle cx="270" cy="158" r="16" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="270" y="162" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          δ−
        </text>
        <line x1="166" y1="158" x2="254" y2="158" stroke={DIAGRAM_STROKE} strokeWidth="3" />
        <path d="M 230 158 L 254 152 L 254 164 Z" fill={DIAGRAM_STROKE} />
        <text x="210" y="198" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          Large ΔEN → polar bond; very large ΔEN → ionic character
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <line x1="120" y1="150" x2="300" y2="150" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <circle cx="210" cy="150" r="4" fill={DIAGRAM_STROKE} />
        <path d="M 210 150 L 260 130" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#en-dip)" />
        <text x="210" y="178" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          Asymmetric molecules → net dipole → IMF and b.p. effects
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="132" width="280" height="52" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="152" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Predict bond type: metallic · ionic · covalent
        </text>
        <text x="210" y="172" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Use EN table in Paper 2 — links to 3.2–3.3 bonding models
        </text>
      </g>

      <defs>
        <marker id="en-dip" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
