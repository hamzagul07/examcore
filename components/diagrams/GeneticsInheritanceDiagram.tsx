'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function GeneticsInheritanceDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Punnett square: allele combinations predict offspring genotypes"
    >
      <rect x="130" y="55" width="160" height="120" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <line x1="210" y1="55" x2="210" y2="175" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1="130" y1="115" x2="290" y2="115" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      {['AB', 'Ab', 'aB', 'ab'].map((g, i) => (
        <text key={g} x={i % 2 ? 250 : 170} y={i < 2 ? 95 : 150} textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} className={i === 0 ? 'eq-anim-force-cw' : undefined}>
          {g}
        </text>
      ))}
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Genotype ratios from parental allele combinations
      </text>
    </svg>
  )
}
