'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function SeriesCircuitDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Series circuit: same current through each component"
    >
      <rect x="60" y="70" width="300" height="60" rx="8" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
      <rect x="100" y="88" width="44" height="24" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="122" y="104" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
        R₁
      </text>
      <rect x="188" y="88" width="44" height="24" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="210" y="104" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
        R₂
      </text>
      <circle cx="300" cy="100" r="14" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="300" y="104" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
        V
      </text>
      <circle
        className="eq-anim-force-cw"
        cx="72"
        cy="100"
        r="5"
        fill={DIAGRAM_STROKE}
      />
      <circle
        className="eq-anim-force-acw"
        cx="348"
        cy="100"
        r="5"
        fill={DIAGRAM_STROKE}
      />
      <text x="210" y="168" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">
        I is the same at every point in series
      </text>
    </svg>
  )
}
