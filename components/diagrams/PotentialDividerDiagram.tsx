'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function PotentialDividerDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Potential divider: output voltage is a fraction of supply voltage"
    >
      <line x1="210" y1="40" x2="210" y2="180" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
      <rect x="175" y="70" width="70" height="28" rx="4" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="210" y="89" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
        R₁
      </text>
      <rect x="175" y="120" width="70" height="28" rx="4" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="210" y="139" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
        R₂
      </text>
      <line x1="245" y1="134" x2="310" y2="134" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-a" />
      <circle cx="310" cy="134" r="14" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="310" y="139" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
        V
      </text>
      <text x="100" y="50" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="700">
        Vₛ
      </text>
      <text x="320" y="120" fontSize="11" fill={DIAGRAM_TEXT}>
        Vₒᵤₜ
      </text>
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Vₒᵤₜ = Vₛ × R₂ / (R₁ + R₂)
      </text>
    </svg>
  )
}
