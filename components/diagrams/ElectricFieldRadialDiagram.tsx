'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function ElectricFieldRadialDiagram({ className = '' }: { className?: string }) {
  const lines = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Radial electric field lines from a positive point charge"
    >
      <circle cx="210" cy="110" r="12" fill={DIAGRAM_STROKE} />
      <text x="210" y="115" textAnchor="middle" fontSize="12" fill="white" fontWeight="700">
        +
      </text>
      {lines.map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        const x2 = 210 + Math.cos(rad) * 95
        const y2 = 110 + Math.sin(rad) * 70
        return (
          <line
            key={deg}
            x1={210 + Math.cos(rad) * 18}
            y1={110 + Math.sin(rad) * 14}
            x2={x2}
            y2={y2}
            stroke={DIAGRAM_STROKE}
            strokeWidth="2"
            className={i % 2 === 0 ? 'eq-anim-vec-a' : 'eq-anim-vec-b'}
            opacity="0.85"
          />
        )
      })}
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        E = kQ/r² — field strength falls with distance squared
      </text>
      <text x="210" y="200" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
        Field lines point away from + charge
      </text>
    </svg>
  )
}
