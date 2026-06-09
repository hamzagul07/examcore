'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function DiffractionSlitDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Single-slit diffraction: waves spread after passing a narrow gap"
    >
      <rect x="180" y="40" width="20" height="140" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="3" />
      <rect x="180" y="95" width="20" height="30" fill="var(--ec-surface-muted)" stroke="none" />
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={40}
          y1={70 + i * 15}
          x2={175}
          y2={70 + i * 15}
          stroke={DIAGRAM_STROKE}
          strokeWidth="1.5"
          className={i === 2 ? 'eq-anim-vec-a' : undefined}
          opacity={0.5 + i * 0.1}
        />
      ))}
      <path
        d="M 200 110 Q 260 70 320 110 Q 380 150 400 110"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2"
        className="eq-anim-vec-b"
      />
      <path
        d="M 200 110 Q 260 150 320 110 Q 380 70 400 110"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2"
        opacity="0.5"
        className="eq-anim-vec-c"
      />
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Narrower slit → wider diffraction pattern
      </text>
    </svg>
  )
}
