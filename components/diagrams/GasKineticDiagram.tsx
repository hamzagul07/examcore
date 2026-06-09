'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function GasKineticDiagram({ className = '' }: { className?: string }) {
  const particles = [
    { cx: 100, cy: 90, dx: 12, dy: -8 },
    { cx: 180, cy: 130, dx: -10, dy: 6 },
    { cx: 260, cy: 80, dx: 8, dy: 10 },
    { cx: 320, cy: 120, dx: -14, dy: -5 },
  ]
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Kinetic theory: gas particles in random motion exert pressure on container walls"
    >
      <rect x="70" y="50" width="280" height="120" rx="8" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
      {particles.map((p, i) => (
        <g key={i}>
          <circle cx={p.cx} cy={p.cy} r="7" fill={DIAGRAM_STROKE} className="eq-anim-force-cw" />
          <line
            x1={p.cx}
            y1={p.cy}
            x2={p.cx + p.dx}
            y2={p.cy + p.dy}
            stroke={DIAGRAM_STROKE}
            strokeWidth="2"
            className={i % 2 === 0 ? 'eq-anim-vec-a' : 'eq-anim-vec-b'}
          />
        </g>
      ))}
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        pV = nRT — faster particles → higher pressure
      </text>
    </svg>
  )
}
