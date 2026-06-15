'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '23-1-lattice-energy-and-born-haber-cycles'

/** Born–Haber and hydration cycles for 9701 topics 23.1 and 23.2. */
export function BornHaberDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const isHydration = lessonSlug.includes('23-2')

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Born-Haber cycles and enthalpies of solution">
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">{isHydration ? 'Enthalpy of solution & hydration' : 'Born–Haber cycle'}</text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <path d="M 80 140 L 160 80 L 240 140 L 320 80 L 340 140" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="210" y="168" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isHydration ? 'ΔH_sol = ΔH_latt + ΣΔH_hyd' : 'ΔH_f° = atomisation + IE + EA + ΔH_latt'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isHydration ? 'Lattice endothermic · hydration exothermic' : 'ΔH_latt: gaseous ions → solid lattice (exothermic)'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isHydration ? 'ΔH_hyd ∝ charge²/r — Mg²⁺ &gt; Na⁺' : '|ΔH_latt| larger for smaller, higher-charge ions'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="142" width="280" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="162" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">{isHydration ? 'AgCl insoluble — hydration &lt; lattice energy' : 'Fajan’s rules: covalent character if ions polarise'}</text>
        <text x="210" y="180" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Hess: all routes to same ΔH must balance</text>
      </g>
    </svg>
  )
}
