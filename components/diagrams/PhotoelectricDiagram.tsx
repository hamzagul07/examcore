'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function PhotoelectricDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Photoelectric effect: photon energy must exceed work function to release electrons"
    >
      <rect x="60" y="130" width="300" height="50" rx="4" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="210" y="160" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
        metal surface (work function Φ)
      </text>
      <line x1="120" y1="60" x2="160" y2="125" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-a" />
      <polygon points="160,125 152,112 168,112" fill={DIAGRAM_STROKE} />
      <text x="105" y="55" fontSize="11" fill={DIAGRAM_TEXT}>
        hf
      </text>
      <circle cx="200" cy="115" r="6" fill={DIAGRAM_STROKE} className="eq-anim-force-cw" />
      <path d="M 206 112 L 250 80" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-b" />
      <text x="255" y="75" fontSize="11" fill={DIAGRAM_TEXT}>
        e⁻
      </text>
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        KEmax = hf − Φ — intensity affects rate, not KEmax
      </text>
    </svg>
  )
}
