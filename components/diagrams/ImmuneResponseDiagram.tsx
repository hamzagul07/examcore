'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function ImmuneResponseDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Antibody binds antigen on pathogen surface"
    >
      <circle cx="130" cy="100" r="35" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="130" y="105" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
        pathogen
      </text>
      <path d="M 200 80 L 230 100 L 200 120 Z" fill={DIAGRAM_STROKE} className="eq-anim-vec-a" />
      <path d="M 250 70 L 280 90 L 250 110 Z" fill={DIAGRAM_STROKE} className="eq-anim-vec-b" opacity="0.7" />
      <text x="310" y="105" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="700">
        antibody
      </text>
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Specific antigen–antibody binding tags pathogens for destruction
      </text>
    </svg>
  )
}
