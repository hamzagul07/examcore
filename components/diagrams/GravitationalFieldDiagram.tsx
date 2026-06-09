'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function GravitationalFieldDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Gravitational field lines point toward the mass; field strength decreases with distance"
    >
      <circle cx="210" cy="110" r="18" fill={DIAGRAM_STROKE} />
      <text x="210" y="115" textAnchor="middle" fontSize="11" fill="white" fontWeight="700">
        M
      </text>
      {[55, 75, 95].map((r, i) => (
        <circle
          key={r}
          cx="210"
          cy="110"
          r={r}
          fill="none"
          stroke={DIAGRAM_STROKE}
          strokeWidth="1.5"
          opacity={0.35 + i * 0.15}
          className={i === 1 ? 'eq-anim-vec-a' : undefined}
        />
      ))}
      <line x1="210" y1="110" x2="210" y2="45" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-b" />
      <polygon points="210,45 202,58 218,58" fill={DIAGRAM_STROKE} />
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        g = GM/r² — field lines point inward toward mass
      </text>
      <text x="320" y="115" fontSize="11" fill={DIAGRAM_TEXT}>
        F = GmM/r²
      </text>
    </svg>
  )
}
