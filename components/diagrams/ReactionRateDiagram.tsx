'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '8-1-rate-of-reaction'

/** Collision theory and rate factors for 9701 topics 8.1 and 8.2. */
export function ReactionRateDiagram({
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
      aria-label="Rate of reaction: collisions, limiting reagent, and activation energy"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Rate — collision frequency × energy ≥ Ea
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <circle cx="140" cy="100" r="14" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <circle cx="280" cy="100" r="14" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <line x1="154" y1="100" x2="266" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-a" />
        <line x1="140" y1="86" x2="140" y2="68" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <line x1="280" y1="86" x2="280" y2="68" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="210" y="140" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          Successful collision — sufficient energy and correct orientation
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="80" y="72" width="44" height="56" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="102" y="104" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          A
        </text>
        <text x="102" y="118" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          runs out
        </text>
        <rect x="160" y="72" width="44" height="56" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="182" y="104" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          B
        </text>
        <text x="210" y="148" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          Limiting reagent caps product — use mole ratio from equation
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="110" y="88" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          ↑ conc
        </text>
        <text x="210" y="88" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          ↑ T
        </text>
        <text x="310" y="88" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          catalyst
        </text>
        <path d="M 60 120 Q 120 60 180 120" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" strokeDasharray="5 4" />
        <text x="120" y="138" fontSize="10" fill={DIAGRAM_TEXT}>
          lower Ea
        </text>
        <text x="210" y="168" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          Surface area, concentration, temperature, catalyst (8.1–8.3)
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <line x1="80" y1="170" x2="340" y2="170" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <line x1="80" y1="170" x2="80" y2="90" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <path d="M 80 160 Q 140 150 200 120 T 340 100" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
        <text x="345" y="174" fontSize="10" fill={DIAGRAM_TEXT}>
          t
        </text>
        <text x="68" y="95" fontSize="10" fill={DIAGRAM_TEXT}>
          amount
        </text>
        <text x="210" y="198" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          Rate = Δproduct / Δt — measure mass, gas volume, or colour change
        </text>
      </g>
    </svg>
  )
}
