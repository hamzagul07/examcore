'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function CellStructureDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Eukaryotic cell with nucleus and membrane-bound organelles"
    >
      <ellipse cx="210" cy="110" rx="155" ry="78" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
      <ellipse cx="210" cy="110" rx="125" ry="58" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="6 4" opacity="0.55" className="eq-anim-vec-b" />
      <circle cx="160" cy="100" r="22" fill="color-mix(in srgb, var(--ec-brand) 25%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-force-cw" />
      <text x="160" y="105" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="700">
        N
      </text>
      <ellipse cx="270" cy="125" rx="28" ry="14" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Eukaryotic cell — membrane, nucleus, organelles
      </text>
    </svg>
  )
}
