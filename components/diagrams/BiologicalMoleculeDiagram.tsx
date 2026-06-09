'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function BiologicalMoleculeDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Biological macromolecules linked by covalent bonds"
    >
      <circle cx="110" cy="100" r="24" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <circle cx="210" cy="70" r="20" fill="color-mix(in srgb, var(--ec-brand) 20%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="2" className="eq-anim-force-cw" />
      <circle cx="310" cy="100" r="24" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <line x1="134" y1="92" x2="190" y2="76" stroke={DIAGRAM_STROKE} strokeWidth="2.5" className="eq-anim-vec-a" />
      <line x1="230" y1="82" x2="286" y2="96" stroke={DIAGRAM_STROKE} strokeWidth="2.5" className="eq-anim-vec-b" />
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Monomers → polymers by condensation; hydrolysis reverses
      </text>
    </svg>
  )
}
