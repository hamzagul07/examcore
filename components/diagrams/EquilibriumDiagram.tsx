'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '7-1-chemical-equilibria-reversible-reactions-dynamic-equilibrium'

/** Dynamic equilibrium and Le Chatelier for 9701 topic 7.1. */
export function EquilibriumDiagram({
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
      aria-label="Chemical equilibrium: reversible reactions, dynamic equilibrium, and Le Chatelier"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Dynamic equilibrium — forward and reverse rates equal
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="70" y="70" width="50" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="95" y="92" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="700">
          A
        </text>
        <rect x="140" y="70" width="50" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="165" y="92" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="700">
          B
        </text>
        <path d="M 200 88 L 248 88" stroke={DIAGRAM_STROKE} strokeWidth="2.5" markerEnd="url(#eq-fwd)" />
        <path d="M 248 78 L 200 78" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#eq-rev)" />
        <rect x="260" y="70" width="50" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="285" y="92" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="700">
          C
        </text>
        <rect x="330" y="70" width="50" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="355" y="92" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="700">
          D
        </text>
        <text x="210" y="130" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          aA + bB ⇌ cC + dD — reversible at molecular level
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="158" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          r(forward) = r(reverse) — concentrations constant, not equal
        </text>
        <line x1="120" y1="168" x2="300" y2="168" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="120" y="184" fontSize="10" fill={DIAGRAM_TEXT}>
          closed system
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="158" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          Le Chatelier: add A → equilibrium shifts right →
        </text>
        <path d="M 280 148 L 330 148" stroke={DIAGRAM_STROKE} strokeWidth="2.5" markerEnd="url(#eq-fwd)" />
        <text x="210" y="178" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          oppose the change (concentration · pressure · temperature)
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="90" y="138" width="240" height="52" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="160" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">
          Kc = [C]ᶜ[D]ᵈ / [A]ᵃ[B]ᵇ
        </text>
        <text x="210" y="180" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Kc changes with temperature only — not with concentration
        </text>
      </g>

      <defs>
        <marker id="eq-fwd" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
        <marker id="eq-rev" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
