'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function PhotosynthesisDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Photosynthesis: light energy converts CO2 and water into glucose and oxygen"
    >
      <ellipse cx="210" cy="110" rx="100" ry="55" fill="color-mix(in srgb, var(--ec-brand) 12%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <path d="M 80 60 L 130 90" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-a" />
      <text x="70" y="55" fontSize="10" fill={DIAGRAM_TEXT}>
        light
      </text>
      <text x="155" y="115" fontSize="11" fill={DIAGRAM_TEXT}>
        CO₂ + H₂O
      </text>
      <path d="M 300 90 L 350 60" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-b" />
      <text x="330" y="55" fontSize="10" fill={DIAGRAM_TEXT}>
        O₂
      </text>
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ (light + chlorophyll)
      </text>
    </svg>
  )
}
