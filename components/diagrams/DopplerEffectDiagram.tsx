'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function DopplerEffectDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Doppler effect: wavefronts bunch ahead of a moving source"
    >
      <circle cx="200" cy="110" r="14" fill={DIAGRAM_STROKE} className="eq-anim-force-cw" />
      <text x="200" y="115" textAnchor="middle" fontSize="10" fill="white" fontWeight="700">
        S
      </text>
      <path d="M 214 110 L 260 110" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#dop-arrow)" />
      <defs>
        <marker id="dop-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      {[55, 85, 120].map((r, i) => (
        <ellipse
          key={r}
          cx={200 - i * 8}
          cy={110}
          rx={r}
          ry={r * 0.55}
          fill="none"
          stroke={DIAGRAM_STROKE}
          strokeWidth="1.5"
          opacity={0.35 + i * 0.15}
          className={i === 0 ? 'eq-anim-vec-a' : undefined}
        />
      ))}
      {[45, 75, 105].map((r, i) => (
        <ellipse
          key={`r-${r}`}
          cx={200 + i * 10}
          cy={110}
          rx={r}
          ry={r * 0.55}
          fill="none"
          stroke={DIAGRAM_STROKE}
          strokeWidth="1.5"
          opacity={0.35 + i * 0.15}
          className={i === 2 ? 'eq-anim-vec-b' : undefined}
        />
      ))}
      <text x="120" y="175" fontSize="11" fill={DIAGRAM_TEXT}>
        longer λ behind → lower f
      </text>
      <text x="250" y="175" fontSize="11" fill={DIAGRAM_TEXT}>
        shorter λ ahead → higher f
      </text>
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Moving source compresses wavefronts in the direction of motion
      </text>
    </svg>
  )
}
