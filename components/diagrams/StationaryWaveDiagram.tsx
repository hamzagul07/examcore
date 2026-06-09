'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function StationaryWaveDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Stationary wave: nodes stay still, antinodes oscillate with maximum amplitude"
    >
      <line x1="40" y1="110" x2="380" y2="110" stroke={DIAGRAM_TEXT} strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
      <path
        d="M 40 110 Q 90 50 140 110 T 240 110 T 340 110 T 380 110"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        className="eq-anim-vec-a"
      />
      <path
        d="M 40 110 Q 90 170 140 110 T 240 110 T 340 110 T 380 110"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2"
        opacity="0.45"
        className="eq-anim-vec-b"
      />
      {[90, 190, 290].map((x) => (
        <circle key={x} cx={x} cy={110} r="5" fill={DIAGRAM_STROKE} />
      ))}
      {[140, 240, 340].map((x) => (
        <circle key={x} cx={x} cy={110} r="4" fill={DIAGRAM_TEXT} className="eq-anim-force-cw" />
      ))}
      <text x="90" y="195" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
        node
      </text>
      <text x="140" y="30" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
        antinode
      </text>
      <text x="210" y="18" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Two counter-propagating waves → stationary pattern
      </text>
    </svg>
  )
}
