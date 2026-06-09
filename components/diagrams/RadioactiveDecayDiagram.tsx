'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function RadioactiveDecayDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Exponential decay curve: activity halves every half-life"
    >
      <line x1="50" y1="180" x2="380" y2="180" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <line x1="50" y1="180" x2="50" y2="40" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <path
        d="M 50 50 Q 120 55 180 90 T 320 165"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        className="eq-anim-vec-a"
      />
      <line x1="50" y1="50" x2="380" y2="50" stroke={DIAGRAM_TEXT} strokeWidth="1" strokeDasharray="5 4" />
      <text x="55" y="45" fontSize="10" fill={DIAGRAM_TEXT}>
        A₀
      </text>
      <line x1="165" y1="50" x2="165" y2="180" stroke={DIAGRAM_TEXT} strokeWidth="1" strokeDasharray="4 3" />
      <text x="168" y="195" fontSize="10" fill={DIAGRAM_TEXT}>
        t½
      </text>
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        A = A₀e^(−λt) — activity halves each half-life
      </text>
    </svg>
  )
}
