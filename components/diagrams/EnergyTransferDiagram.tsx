'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function EnergyTransferDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Energy stores transfer: kinetic, gravitational potential, and thermal"
    >
      <rect x="60" y="80" width="90" height="50" rx="8" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="105" y="110" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
        KE
      </text>
      <rect x="270" y="50" width="90" height="50" rx="8" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="315" y="80" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
        GPE
      </text>
      <path d="M 150 105 L 265 75" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#en-arr)" className="eq-anim-vec-a" />
      <path d="M 315 100 L 200 130" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#en-arr)" className="eq-anim-vec-b" opacity="0.6" />
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        ΔE_total = 0 in a closed system (no external work)
      </text>
      <defs>
        <marker id="en-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
