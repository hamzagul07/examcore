'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function PlantTransportDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Xylem transports water up; phloem transports assimilates"
    >
      <line x1="210" y1="40" x2="210" y2="170" stroke={DIAGRAM_STROKE} strokeWidth="4" />
      <ellipse cx="210" cy="50" rx="40" ry="20" fill="color-mix(in srgb, var(--ec-brand) 15%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <path d="M 210 80 L 210 50" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-a" markerEnd="url(#pt-arr)" />
      <text x="250" y="75" fontSize="10" fill={DIAGRAM_TEXT}>
        xylem ↑ H₂O
      </text>
      <path d="M 210 130 L 210 160" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-b" markerEnd="url(#pt-arr)" />
      <text x="250" y="145" fontSize="10" fill={DIAGRAM_TEXT}>
        phloem ↓ sugars
      </text>
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Transpiration pull + cohesion–tension in xylem
      </text>
      <defs>
        <marker id="pt-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
