'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function BiotechDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Recombinant DNA: insert target gene into plasmid vector"
    >
      <circle cx="120" cy="100" r="40" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="120" y="105" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
        plasmid
      </text>
      <rect x="250" y="80" width="90" height="40" rx="6" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-force-cw" />
      <text x="295" y="105" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
        gene
      </text>
      <path d="M 200 100 L 248 100" stroke={DIAGRAM_STROKE} strokeWidth="2.5" markerEnd="url(#bt-arr)" className="eq-anim-vec-a" />
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Cut vector + insert gene → clone in host bacteria
      </text>
      <defs>
        <marker id="bt-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
