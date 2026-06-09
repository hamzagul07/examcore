'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function AcWaveformDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Alternating current: sinusoidal voltage and current with peak and r.m.s. values"
    >
      <line x1="50" y1="110" x2="380" y2="110" stroke={DIAGRAM_TEXT} strokeWidth="1" opacity="0.35" />
      <path
        d="M 50 110 Q 90 40 130 110 T 210 110 T 290 110 T 370 110"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        className="eq-anim-vec-a"
      />
      <line x1="130" y1="40" x2="130" y2="110" stroke={DIAGRAM_TEXT} strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="138" y="50" fontSize="10" fill={DIAGRAM_TEXT}>
        V₀
      </text>
      <line x1="210" y1="72" x2="210" y2="110" stroke={DIAGRAM_TEXT} strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="218" y="82" fontSize="10" fill={DIAGRAM_TEXT}>
        Vrms
      </text>
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Vrms = V₀/√2 — polarity reverses every half-cycle
      </text>
    </svg>
  )
}
