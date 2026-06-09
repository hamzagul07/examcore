'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function UniformElectricFieldDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Uniform electric field between parallel plates"
    >
      <line x1="100" y1="50" x2="100" y2="170" stroke={DIAGRAM_STROKE} strokeWidth="4" />
      <line x1="320" y1="50" x2="320" y2="170" stroke={DIAGRAM_STROKE} strokeWidth="4" />
      <text x="100" y="42" textAnchor="middle" fontSize="14" fill={DIAGRAM_STROKE} fontWeight="700">
        +
      </text>
      <text x="320" y="42" textAnchor="middle" fontSize="14" fill={DIAGRAM_TEXT} fontWeight="700">
        −
      </text>
      {[70, 100, 130, 160].map((y, i) => (
        <line
          key={y}
          x1="115"
          y1={y}
          x2="305"
          y2={y}
          stroke={DIAGRAM_STROKE}
          strokeWidth="2"
          markerEnd="url(#uef-arr)"
          className={i % 2 === 0 ? 'eq-anim-vec-a' : 'eq-anim-vec-b'}
          opacity="0.85"
        />
      ))}
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Uniform E between plates: E = V/d
      </text>
      <defs>
        <marker id="uef-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
