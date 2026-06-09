'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function MagneticFieldDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Magnetic field around a current-carrying conductor"
    >
      <line x1="210" y1="40" x2="210" y2="180" stroke={DIAGRAM_STROKE} strokeWidth="5" />
      <text x="230" y="115" fontSize="12" fill={DIAGRAM_TEXT}>
        I ↑
      </text>
      {[40, 65, 90].map((r, i) => (
        <ellipse
          key={r}
          cx="210"
          cy="110"
          rx={r}
          ry={r * 0.45}
          fill="none"
          stroke={DIAGRAM_STROKE}
          strokeWidth="1.5"
          className={i === 1 ? 'eq-anim-vec-a' : undefined}
          opacity={0.4 + i * 0.15}
        />
      ))}
      <text x="120" y="75" fontSize="16" fill={DIAGRAM_STROKE} fontWeight="700">
        ⊗
      </text>
      <text x="285" y="145" fontSize="16" fill={DIAGRAM_STROKE} fontWeight="700">
        ⊙
      </text>
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        F = BIL sin θ — field forms circles around the wire
      </text>
    </svg>
  )
}
