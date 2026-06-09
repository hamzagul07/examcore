'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function SimpleHarmonicMotionDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Simple harmonic motion: displacement varies sinusoidally with time"
    >
      <line x1="40" y1="170" x2="380" y2="170" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <line x1="40" y1="170" x2="40" y2="50" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="385" y="175" fontSize="12" fill={DIAGRAM_TEXT}>
        t
      </text>
      <text x="28" y="55" fontSize="12" fill={DIAGRAM_TEXT}>
        x
      </text>
      <path
        d="M 40 110 C 90 60, 130 60, 170 110 S 250 160, 290 110 S 370 60, 380 110"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        className="eq-anim-vec-a"
      />
      <circle cx="170" cy="110" r="7" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-force-cw" />
      <line x1="40" y1="110" x2="380" y2="110" stroke={DIAGRAM_TEXT} strokeWidth="1" strokeDasharray="5 4" opacity="0.5" />
      <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
        x = 0
      </text>
      <text x="210" y="205" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">
        x = A sin(ωt) — acceleration always toward equilibrium
      </text>
    </svg>
  )
}
