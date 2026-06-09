'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function MitosisDiagram({ className = '' }: { className?: string }) {
  const stages = [80, 160, 240, 320]
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Mitosis produces two genetically identical daughter cells"
    >
      {stages.map((x, i) => (
        <ellipse key={x} cx={x} cy={110} rx={32} ry={40} fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" className={i === 2 ? 'eq-anim-force-cw' : undefined} />
      ))}
      <line x1="112" y1="110" x2="128" y2="110" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-vec-a" />
      <line x1="272" y1="95" x2="288" y2="95" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1="272" y1="125" x2="288" y2="125" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Prophase → metaphase → anaphase → two identical nuclei
      </text>
    </svg>
  )
}
