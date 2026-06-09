'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function KinematicsGraphDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 240"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Displacement-time graph: gradient gives velocity"
    >
      <line x1="50" y1="200" x2="380" y2="200" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <line x1="50" y1="200" x2="50" y2="40" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="385" y="205" fontSize="12" fill={DIAGRAM_TEXT}>
        t
      </text>
      <text x="38" y="45" fontSize="12" fill={DIAGRAM_TEXT}>
        s
      </text>
      <path
        d="M 50 180 Q 120 170 190 130 T 330 70"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        className="eq-anim-vec-a"
      />
      <circle cx="190" cy="130" r="6" fill={DIAGRAM_STROKE} className="eq-anim-force-cw" />
      <line x1="50" y1="180" x2="190" y2="130" stroke={DIAGRAM_TEXT} strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="120" y="145" fontSize="11" fill={DIAGRAM_TEXT}>
        gradient = v
      </text>
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Steeper s–t graph → greater velocity
      </text>
    </svg>
  )
}
