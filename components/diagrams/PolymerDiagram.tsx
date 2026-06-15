'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '20-1-addition-polymerisation'

export function PolymerDiagram({ className = '', stepIndex = 0, lessonSlug = DEFAULT_SLUG }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const mode = lessonSlug.includes('35-1') ? 'condensation' : lessonSlug.includes('35-2') ? 'predict' : lessonSlug.includes('35-3') ? 'degrade' : 'addition'

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Addition and condensation polymerisation">
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        {mode === 'addition' ? 'Addition polymerisation' : mode === 'condensation' ? 'Condensation polymerisation' : mode === 'predict' ? 'Predicting polymer type' : 'Degradable polymers'}
      </text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line x1="100" y1="100" x2="320" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="3" />
        {[120, 160, 200, 240, 280].map((x) => <circle key={x} cx={x} cy={100} r="6" fill={DIAGRAM_STROKE} />)}
        <text x="210" y="130" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{mode === 'addition' ? 'Alkene C=C opens — repeat unit –[CH₂–CHX]–' : 'Monomers with two functional groups'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{mode === 'condensation' ? 'Small molecule eliminated (H₂O, HCl) each step' : 'n monomers → one polymer + no by-product (addition)'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{mode === 'degrade' ? 'Hydrolysis / photodegradable — environmental impact' : 'PET · nylon · Kevlar — know linkages'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="142" width="280" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="162" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Draw one repeat unit — show continuation bonds</text>
        <text x="210" y="180" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Disposal: addition often non-biodegradable</text>
      </g>
    </svg>
  )
}
