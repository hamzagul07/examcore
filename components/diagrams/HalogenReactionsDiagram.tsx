'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '11-3-some-reactions-of-the-halide-ions'

export function HalogenReactionsDiagram({ className = '', stepIndex = 0, lessonSlug = DEFAULT_SLUG }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const isChlorine = lessonSlug.includes('11-4')

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Halide ion reactions and chlorine chemistry">
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">{isChlorine ? 'Reactions of chlorine' : 'Halide ion reactions'}</text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isChlorine ? 'Cl₂ + H₂O ⇌ HCl + HOCl (chlorination of water)' : 'X⁻ as reducing agents — reducing power ↑ down group'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isChlorine ? 'Disproportionation with cold dilute NaOH' : 'AgNO₃(aq): AgCl white · AgBr cream · AgI yellow'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isChlorine ? 'Cl₂ + 2OH⁻ → Cl⁻ + ClO⁻ + H₂O' : 'Conc H₂SO₄: HCl gas · HBr/HI reduced to halogen'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="142" width="280" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="162" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">NH₃ + halide → halogenoalkane (nucleophilic substitution)</text>
        <text x="210" y="180" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>State observations — precipitate colour in tests</text>
      </g>
    </svg>
  )
}
