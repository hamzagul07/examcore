'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function MomentsDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Moments: force × perpendicular distance from pivot"
    >
      <polygon points="200,150 190,170 210,170" fill={DIAGRAM_STROKE} />
      <line x1="80" y1="150" x2="320" y2="150" stroke={DIAGRAM_STROKE} strokeWidth="4" />
      <rect x="120" y="120" width="160" height="30" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <line x1="100" y1="135" x2="100" y2="70" stroke={DIAGRAM_STROKE} strokeWidth="2.5" className="eq-anim-vec-a" />
      <polygon points="100,70 92,82 108,82" fill={DIAGRAM_STROKE} />
      <text x="88" y="58" fontSize="11" fill={DIAGRAM_TEXT}>
        F
      </text>
      <line x1="100" y1="150" x2="100" y2="135" stroke={DIAGRAM_TEXT} strokeWidth="1.5" strokeDasharray="3 3" />
      <text x="108" y="145" fontSize="10" fill={DIAGRAM_TEXT}>
        d
      </text>
      <line x1="300" y1="135" x2="300" y2="90" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-b" />
      <polygon points="300,90 292,102 308,102" fill={DIAGRAM_STROKE} />
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        moment = F × d — clockwise = anticlockwise at equilibrium
      </text>
    </svg>
  )
}
