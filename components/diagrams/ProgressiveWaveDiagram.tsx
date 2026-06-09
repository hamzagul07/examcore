'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function ProgressiveWaveDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Progressive wave transferring energy without transferring matter"
    >
      <path
        d="M 30 100 Q 70 60 110 100 T 190 100 T 270 100 T 350 100"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        className="eq-anim-vec-a"
      />
      <circle cx="110" cy="100" r="5" fill={DIAGRAM_STROKE} className="eq-anim-force-cw" />
      <line x1="110" y1="100" x2="110" y2="70" stroke={DIAGRAM_TEXT} strokeWidth="1.5" />
      <text x="118" y="78" fontSize="10" fill={DIAGRAM_TEXT}>
        particle ↕
      </text>
      <path d="M 20 155 H 400" stroke={DIAGRAM_STROKE} strokeWidth="1.5" markerEnd="url(#pw-arr)" opacity="0.6" />
      <text x="210" y="175" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
        energy →
      </text>
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        v = fλ — crests travel; medium oscillates locally
      </text>
      <defs>
        <marker id="pw-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
