'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function GasExchangeDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Alveolus gas exchange: O2 diffuses in, CO2 diffuses out down concentration gradients"
    >
      <circle cx="210" cy="100" r="55" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={180 + i * 15} cy={85 + (i % 2) * 30} r="8" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      ))}
      <path d="M 100 100 L 150 100" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-a" />
      <text x="85" y="95" fontSize="10" fill={DIAGRAM_TEXT}>
        O₂
      </text>
      <path d="M 270 100 L 320 100" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-b" />
      <text x="330" y="95" fontSize="10" fill={DIAGRAM_TEXT}>
        CO₂
      </text>
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Thin moist surface + steep diffusion gradient at alveoli
      </text>
    </svg>
  )
}
