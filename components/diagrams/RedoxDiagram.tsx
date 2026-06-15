'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '6-1-redox-processes-electron-transfer-and-changes-in-oxidation-number-oxidation-state'

/** Redox and oxidation numbers for 9701 topic 6.1. */
export function RedoxDiagram({
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
      aria-label="Redox reactions: electron transfer and oxidation number changes"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Redox — OIL RIG (Oxidation Is Loss, Reduction Is Gain)
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <circle cx="120" cy="100" r="20" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="120" y="104" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Zn
        </text>
        <path d="M 145 100 L 185 100" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#rx-arr)" />
        <text x="165" y="88" fontSize="9" fill={DIAGRAM_TEXT}>
          2e⁻
        </text>
        <circle cx="300" cy="100" r="20" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="300" y="104" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Cu²⁺
        </text>
        <text x="210" y="148" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          Zn oxidised (loses e⁻) · Cu²⁺ reduced (gains e⁻)
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="100" y="88" fontSize="10" fill={DIAGRAM_TEXT}>
          Zn: 0 → +2
        </text>
        <text x="260" y="88" fontSize="10" fill={DIAGRAM_TEXT}>
          Cu: +2 → 0
        </text>
        <text x="210" y="168" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          O rules: element 0 · ion = charge · O usually −2 · H usually +1
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Oxidation and reduction always occur together
        </text>
        <line x1="100" y1="120" x2="320" y2="120" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="120" y="138" fontSize="10" fill={DIAGRAM_TEXT}>
          oxidising agent
        </text>
        <text x="260" y="138" fontSize="10" fill={DIAGRAM_TEXT}>
          reducing agent
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="148" width="280" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="168" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Balance half-equations: atoms then charge
        </text>
        <text x="210" y="186" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Combine for full ionic equation — cancel spectator ions
        </text>
      </g>

      <defs>
        <marker id="rx-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
