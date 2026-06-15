'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '24-1-electrolysis'

/** Electrolysis and electrochemical cells for 9701 topics 24.1 and 24.2. */
export function ElectrochemistryDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const isCell = lessonSlug.includes('24-2')

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Electrolysis and electrochemical cells">
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">{isCell ? 'Standard electrode potentials' : 'Electrolysis — DC driven redox'}</text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="100" y="60" width="220" height="80" rx="6" fill="color-mix(in srgb, var(--ec-brand) 6%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <line x1="160" y1="60" x2="160" y2="140" stroke={DIAGRAM_STROKE} strokeWidth="3" />
        <line x1="260" y1="60" x2="260" y2="140" stroke={DIAGRAM_STROKE} strokeWidth="3" />
        <text x="160" y="158" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>{isCell ? 'anode (−)' : 'anode (+)'}</text>
        <text x="260" y="158" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>{isCell ? 'cathode (+)' : 'cathode (−)'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isCell ? 'E°cell = E°(cathode) − E°(anode)' : 'Cations → cathode (reduction) · anions → anode (oxidation)'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isCell ? 'Higher E° = stronger oxidising agent' : 'Aqueous: H⁺/OH⁻ may compete at electrodes'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="142" width="280" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="162" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">{isCell ? 'Nernst: E = E° − (0.059/n) log Q at 298 K' : 'Faraday: n = It/F — mass ∝ charge'}</text>
        <text x="210" y="180" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>F = 96500 C mol⁻¹</text>
      </g>
    </svg>
  )
}
