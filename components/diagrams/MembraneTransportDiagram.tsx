'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function MembraneTransportDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Fluid mosaic membrane with protein channel for facilitated diffusion"
    >
      <line x1="60" y1="80" x2="360" y2="80" stroke={DIAGRAM_STROKE} strokeWidth="3" />
      <line x1="60" y1="120" x2="360" y2="120" stroke={DIAGRAM_STROKE} strokeWidth="3" />
      {[100, 160, 220, 280, 340].map((x, i) => (
        <circle key={x} cx={x} cy={i % 2 ? 72 : 128} r="6" fill={DIAGRAM_STROKE} opacity="0.7" />
      ))}
      <rect x="195" y="65" width="30" height="70" rx="4" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-a" />
      <circle cx="210" cy="55" r="8" fill={DIAGRAM_STROKE} className="eq-anim-force-cw" />
      <path d="M 210 63 L 210 78" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-b" />
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Phospholipid bilayer + channel proteins move ions and molecules
      </text>
    </svg>
  )
}
