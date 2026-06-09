'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function VectorAdditionDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Vector addition: resultant by parallelogram or nose-to-tail rule"
    >
      <line x1="80" y1="140" x2="200" y2="60" stroke={DIAGRAM_STROKE} strokeWidth="2.5" className="eq-anim-vec-a" markerEnd="url(#va-arr)" />
      <text x="125" y="85" fontSize="11" fill={DIAGRAM_TEXT}>
        a
      </text>
      <line x1="80" y1="140" x2="280" y2="140" stroke={DIAGRAM_STROKE} strokeWidth="2.5" className="eq-anim-vec-b" markerEnd="url(#va-arr)" />
      <text x="175" y="155" fontSize="11" fill={DIAGRAM_TEXT}>
        b
      </text>
      <line x1="80" y1="140" x2="280" y2="60" stroke={DIAGRAM_STROKE} strokeWidth="3" strokeDasharray="6 4" className="eq-anim-vec-c" markerEnd="url(#va-arr)" />
      <text x="290" y="58" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="700">
        R
      </text>
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Vector R = a + b — magnitude and direction both matter
      </text>
      <defs>
        <marker id="va-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
