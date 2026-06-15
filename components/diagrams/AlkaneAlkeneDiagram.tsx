'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '14-1-alkanes'

/** Alkanes and alkenes for 9701 topics 14.1 and 14.2. */
export function AlkaneAlkeneDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const isAlkene = lessonSlug.includes('14-2')

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Alkanes and alkenes: structure and reactions">
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">{isAlkene ? 'Alkenes — C=C unsaturated' : 'Alkanes — saturated CₙH₂ₙ₊₂'}</text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line x1="140" y1="100" x2="280" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
        {!isAlkene && <line x1="210" y1="100" x2="210" y2="60" stroke={DIAGRAM_STROKE} strokeWidth="2" />}
        {isAlkene && (
          <>
            <line x1="190" y1="85" x2="190" y2="70" stroke={DIAGRAM_STROKE} strokeWidth="2" />
            <line x1="190" y1="100" x2="210" y2="80" stroke={DIAGRAM_STROKE} strokeWidth="2" opacity="0.6" />
          </>
        )}
        <text x="210" y="130" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isAlkene ? 'One σ + one π bond — planar around C=C' : 'Tetrahedral sp³ — σ bonds only'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isAlkene ? 'Electrophilic addition: π electrons attack E⁺' : 'Free-radical substitution: R· + X₂ → RX + HX'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isAlkene ? 'Markovnikov: H to C with more H already' : 'Combustion: alkane + O₂ → CO₂ + H₂O'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="138" width="280" height="52" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="158" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">{isAlkene ? 'Test: decolourises bromine water' : 'Cracking: long alkane → alkane + alkene'}</text>
        <text x="210" y="176" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Show reagents and conditions in exam answers</text>
      </g>
    </svg>
  )
}
