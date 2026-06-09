'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function EcologyDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Food web: energy flows from producers to consumers"
    >
      <rect x="170" y="140" width="80" height="28" rx="6" fill="color-mix(in srgb, var(--ec-brand) 15%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="210" y="159" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
        producer
      </text>
      <rect x="80" y="80" width="70" height="28" rx="6" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <rect x="270" y="80" width="70" height="28" rx="6" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <line x1="210" y1="140" x2="115" y2="108" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-a" />
      <line x1="210" y1="140" x2="305" y2="108" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-b" />
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Energy transfer between trophic levels — ~10% passed on
      </text>
    </svg>
  )
}
