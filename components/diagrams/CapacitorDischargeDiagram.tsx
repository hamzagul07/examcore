'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function CapacitorDischargeDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Capacitor discharge: potential difference decreases exponentially"
    >
      <line x1="50" y1="160" x2="370" y2="160" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <line x1="50" y1="160" x2="50" y2="40" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="375" y="165" fontSize="12" fill={DIAGRAM_TEXT}>
        t
      </text>
      <text x="38" y="45" fontSize="12" fill={DIAGRAM_TEXT}>
        V
      </text>
      <path
        d="M 50 50 Q 120 52 180 80 T 320 145 L 370 155"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        className="eq-anim-vec-c"
      />
      <rect x="300" y="55" width="50" height="30" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="325" y="74" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
        C
      </text>
      <text x="210" y="28" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">
        V = V₀ e^(−t/RC)
      </text>
    </svg>
  )
}
