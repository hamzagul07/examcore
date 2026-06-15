'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '26-1-simple-rate-equations-orders-of-reaction-and-rate-constants'

export function RateLawDiagram({ className = '', stepIndex = 0, lessonSlug = DEFAULT_SLUG }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const isCatalyst = lessonSlug.includes('26-2')

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Rate equations and reaction orders">
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">{isCatalyst ? 'Homogeneous & heterogeneous catalysis' : 'Rate equations & orders'}</text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="210" y="96" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="600">rate = k[A]ᵐ[B]ⁿ</text>
        <text x="210" y="122" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>Order m, n from initial rates method or graphs</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isCatalyst ? 'Homogeneous: same phase (Fe²⁺/Fe³⁺ in I⁻/S₂O₈²⁻)' : 'Zero order: [A]⁰ — rate independent of [A]'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isCatalyst ? 'Heterogeneous: surface adsorption (Fe Haber, V₂O₅ Contact)' : 'Half-life t½ for first order: ln 2 / k'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="142" width="280" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="162" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Arrhenius: k = Ae^(−Ea/RT) — ln k vs 1/T graph</text>
        <text x="210" y="180" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Catalyst lowers Ea — does not change ΔH or K</text>
      </g>
    </svg>
  )
}
