'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function InterferenceDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Two-source interference: path difference determines constructive or destructive fringes"
    >
      <path
        d="M 60 110 Q 140 70 220 110"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2"
        className="eq-anim-vec-a"
        opacity="0.85"
      />
      <path
        d="M 60 110 Q 140 150 220 110"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2"
        className="eq-anim-vec-b"
        opacity="0.85"
      />
      <circle cx="60" cy="110" r="6" fill={DIAGRAM_STROKE} />
      <circle cx="60" cy="90" r="4" fill={DIAGRAM_STROKE} opacity="0.6" />
      <circle cx="60" cy="130" r="4" fill={DIAGRAM_STROKE} opacity="0.6" />
      <line x1="220" y1="60" x2="220" y2="160" stroke={DIAGRAM_TEXT} strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="232" y="115" fontSize="11" fill={DIAGRAM_TEXT}>
        screen
      </text>
      <text x="130" y="88" fontSize="11" fill={DIAGRAM_TEXT}>
        S₁
      </text>
      <text x="130" y="138" fontSize="11" fill={DIAGRAM_TEXT}>
        S₂
      </text>
      <text x="210" y="48" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
        bright
      </text>
      <text x="210" y="178" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
        dark
      </text>
      <text x="210" y="210" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">
        Δpath = nλ → constructive
      </text>
    </svg>
  )
}
