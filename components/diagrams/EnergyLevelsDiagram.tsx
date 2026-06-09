'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function EnergyLevelsDiagram({ className = '' }: { className?: string }) {
  const levels = [160, 120, 85, 55]
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Atomic energy levels: electrons jump up by absorbing photons and down by emitting photons"
    >
      {levels.map((y, i) => (
        <line key={y} x1="100" y1={y} x2="320" y2={y} stroke={DIAGRAM_STROKE} strokeWidth={i === 0 ? 3 : 2} opacity={0.5 + i * 0.12} />
      ))}
      <line x1="180" y1="120" x2="180" y2="85" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-a" markerEnd="url(#el-arr)" />
      <text x="188" y="100" fontSize="10" fill={DIAGRAM_TEXT}>
        hf
      </text>
      <line x1="250" y1="85" x2="250" y2="120" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-b" markerEnd="url(#el-arr)" opacity="0.7" />
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        ΔE = hf — discrete photon energies give line spectra
      </text>
      <defs>
        <marker id="el-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
