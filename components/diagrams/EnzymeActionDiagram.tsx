'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function EnzymeActionDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Lock-and-key enzyme binding at the active site"
    >
      <path
        d="M 120 130 Q 180 60 240 130 Q 300 200 360 130"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="3"
        className="eq-anim-vec-a"
      />
      <rect x="175" y="95" width="70" height="35" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-force-cw" />
      <text x="210" y="118" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
        substrate
      </text>
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Active site + substrate → ES complex → products
      </text>
    </svg>
  )
}
