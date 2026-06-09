'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function CentripetalMotionDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 240"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Uniform circular motion: velocity tangent, centripetal acceleration toward centre"
    >
      <defs>
        <marker id="cent-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      <circle cx="210" cy="120" r="70" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" strokeDasharray="6 4" />
      <circle cx="210" cy="120" r="4" fill={DIAGRAM_STROKE} />
      <circle cx="280" cy="120" r="10" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-force-cw" />
      <line x1="280" y1="120" x2="350" y2="120" stroke={DIAGRAM_STROKE} strokeWidth="2.5" markerEnd="url(#cent-arrow)" />
      <text x="318" y="108" fontSize="11" fill={DIAGRAM_TEXT}>
        v
      </text>
      <line x1="280" y1="120" x2="210" y2="120" stroke={DIAGRAM_STROKE} strokeWidth="2.5" markerEnd="url(#cent-arrow)" />
      <text x="238" y="108" fontSize="11" fill={DIAGRAM_TEXT}>
        a
      </text>
      <text x="210" y="210" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">
        a = v²/r toward the centre
      </text>
    </svg>
  )
}
