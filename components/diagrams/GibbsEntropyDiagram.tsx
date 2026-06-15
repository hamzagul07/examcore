'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '23-3-entropy-change-s'

/** Entropy and Gibbs free energy for 9701 topics 23.3 and 23.4. */
export function GibbsEntropyDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const isGibbs = lessonSlug.includes('23-4')

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Entropy change and Gibbs free energy">
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">{isGibbs ? 'Gibbs free energy ΔG' : 'Entropy change ΔS'}</text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="120" y="96" fontSize="11" fill={DIAGRAM_TEXT}>S</text>
        <text x="120" y="118" fontSize="10" fill={DIAGRAM_TEXT}>gas</text>
        <text x="210" y="118" fontSize="10" fill={DIAGRAM_TEXT}>liquid</text>
        <text x="300" y="118" fontSize="10" fill={DIAGRAM_TEXT}>solid</text>
        <path d="M 300 100 L 210 100 L 120 100" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#ge-arr)" />
        <text x="210" y="148" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>Disorder: gas &gt; liquid &gt; solid</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="100" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">ΔS = S(products) − S(reactants)</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="96" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">ΔG = ΔH − TΔS</text>
        <text x="210" y="122" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>Spontaneous when ΔG &lt; 0</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="142" width="280" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="162" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">{isGibbs ? 'ΔG° = −RT ln K · ΔG° = −nFE°' : 'Endothermic + ΔS &gt; 0 feasible at high T'}</text>
        <text x="210" y="180" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>T when ΔG = 0: T = ΔH/ΔS</text>
      </g>
      <defs><marker id="ge-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} /></marker></defs>
    </svg>
  )
}
