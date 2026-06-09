'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function StressStrainDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Stress-strain curve: Hooke's law region then yield and plastic deformation"
    >
      <line x1="50" y1="180" x2="380" y2="180" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <line x1="50" y1="180" x2="50" y2="40" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="385" y="185" fontSize="11" fill={DIAGRAM_TEXT}>
        ε
      </text>
      <text x="38" y="45" fontSize="11" fill={DIAGRAM_TEXT}>
        σ
      </text>
      <path d="M 50 180 L 140 70" stroke={DIAGRAM_STROKE} strokeWidth="2.5" className="eq-anim-vec-a" />
      <path d="M 140 70 Q 200 65 240 100 T 340 150" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-b" />
      <circle cx="140" cy="70" r="5" fill={DIAGRAM_STROKE} />
      <text x="148" y="62" fontSize="10" fill={DIAGRAM_TEXT}>
        limit of proportionality
      </text>
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        σ = F/A , ε = ΔL/L — gradient = Young modulus E
      </text>
    </svg>
  )
}
