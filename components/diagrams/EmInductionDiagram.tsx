'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function EmInductionDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Electromagnetic induction: changing flux induces e.m.f. in a coil"
    >
      <rect x="130" y="60" width="160" height="100" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
      {[150, 175, 200, 225, 250, 275].map((x) => (
        <path
          key={x}
          d={`M ${x} 55 Q ${x - 8} 110 ${x} 165`}
          fill="none"
          stroke={DIAGRAM_STROKE}
          strokeWidth="2.5"
        />
      ))}
      <rect x="70" y="85" width="30" height="50" rx="4" fill={DIAGRAM_STROKE} className="eq-anim-force-cw" />
      <text x="85" y="115" textAnchor="middle" fontSize="14" fill="white" fontWeight="700">
        N
      </text>
      <path d="M 100 110 L 125 110" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#em-arrow)" />
      <defs>
        <marker id="em-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      <circle cx="330" cy="110" r="22" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="330" y="115" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="700">
        ε
      </text>
      <line x1="290" y1="110" x2="308" y2="110" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        ε = −dΦ/dt — faster flux change → larger induced e.m.f.
      </text>
    </svg>
  )
}
