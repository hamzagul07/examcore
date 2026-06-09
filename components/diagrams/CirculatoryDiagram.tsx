'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function CirculatoryDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Double circulation: heart pumps blood to lungs and body"
    >
      <path
        d="M 210 100 C 150 40 80 70 100 120 C 120 160 210 170 210 100 C 210 170 300 160 320 120 C 340 70 270 40 210 100"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        className="eq-anim-vec-a"
      />
      <circle cx="210" cy="100" r="18" fill="color-mix(in srgb, var(--ec-brand) 20%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-force-cw" />
      <text x="60" y="95" fontSize="10" fill={DIAGRAM_TEXT}>
        lungs
      </text>
      <text x="330" y="95" fontSize="10" fill={DIAGRAM_TEXT}>
        body
      </text>
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Pulmonary + systemic circuits — double circulation
      </text>
    </svg>
  )
}
