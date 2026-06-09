'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function DnaReplicationDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Semi-conservative DNA replication: each new molecule has one old and one new strand"
    >
      <path d="M 160 50 C 120 90 120 150 160 170" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.5" className="eq-anim-vec-a" />
      <path d="M 260 50 C 300 90 300 150 260 170" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.5" className="eq-anim-vec-b" />
      <line x1="175" y1="70" x2="245" y2="85" stroke={DIAGRAM_TEXT} strokeWidth="1.5" opacity="0.5" />
      <line x1="170" y1="110" x2="230" y2="110" stroke={DIAGRAM_TEXT} strokeWidth="1.5" opacity="0.5" />
      <line x1="175" y1="150" x2="245" y2="135" stroke={DIAGRAM_TEXT} strokeWidth="1.5" opacity="0.5" />
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Helicase unwinds; each daughter DNA is half original, half new
      </text>
    </svg>
  )
}
