'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '12-1-nitrogen-and-sulfur'

export function NitrogenChemDiagram({ className = '', stepIndex = 0, lessonSlug = DEFAULT_SLUG }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const isNitrile = lessonSlug.includes('19-2')

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Nitrogen, sulfur, and nitrile chemistry">
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">{isNitrile ? 'Nitriles & hydroxynitriles' : 'Nitrogen & sulfur'}</text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isNitrile ? 'R–CN from KCN + halogenoalkane · hydrolysis → acid' : 'N≡N triple bond — Haber: N₂ + 3H₂ ⇌ 2NH₃'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isNitrile ? 'Aldehyde + HCN → hydroxynitrile (C=O addition)' : 'NO, NO₂ — acid rain · photochemical smog'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isNitrile ? 'Chain extension by one carbon in synthesis' : 'SO₂ → SO₃ → H₂SO₄ — Contact process'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="142" width="280" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="162" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">{isNitrile ? 'CN⁻ nucleophile — reflux in ethanol' : 'Test NH₃: damp red litmus → blue'}</text>
      </g>
    </svg>
  )
}
