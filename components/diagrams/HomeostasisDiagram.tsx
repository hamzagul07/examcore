'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function HomeostasisDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Negative feedback loop maintains a steady internal set point"
    >
      <rect x="170" y="75" width="80" height="50" rx="8" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="210" y="105" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
        set point
      </text>
      <path d="M 250 100 L 320 100 L 320 50 L 250 50" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#ho-arr)" className="eq-anim-vec-a" />
      <path d="M 170 100 L 100 100 L 100 150 L 170 150" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#ho-arr)" className="eq-anim-vec-b" />
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Negative feedback: detect change → correct → return to set point
      </text>
      <defs>
        <marker id="ho-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
