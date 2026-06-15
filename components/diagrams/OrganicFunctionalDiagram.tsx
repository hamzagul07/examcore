'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '16-1-alcohols'

/** Alcohols, carbonyls, acids, esters, amines for 9701 topics 16–19. */
export function OrganicFunctionalDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const mode = lessonSlug.includes('17-1')
    ? 'carbonyl'
    : lessonSlug.includes('18-1')
      ? 'acid'
      : lessonSlug.includes('18-2')
        ? 'ester'
        : lessonSlug.includes('19-1')
          ? 'amine'
          : 'alcohol'

  const titles = { alcohol: 'Alcohols — R–OH', carbonyl: 'Aldehydes & ketones — C=O', acid: 'Carboxylic acids — R–COOH', ester: 'Esters — R–COO–R′', amine: 'Primary amines — R–NH₂' }

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Organic functional groups and characteristic reactions">
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">{titles[mode]}</text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="210" y="100" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="600">
          {mode === 'alcohol' && '1° · 2° · 3° classification'}
          {mode === 'carbonyl' && 'C=O polar — δ+ on carbon'}
          {mode === 'acid' && 'Weak acid — partial dissociation'}
          {mode === 'ester' && '–COO– linkage from acid + alcohol'}
          {mode === 'amine' && 'Lone pair on N — nucleophile / base'}
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          {mode === 'alcohol' && '1° → aldehyde → acid · 2° → ketone · 3° resists oxidation'}
          {mode === 'carbonyl' && 'Aldehyde oxidised (Tollens⁺) · ketone not'}
          {mode === 'acid' && 'With base → salt · with alcohol → ester'}
          {mode === 'ester' && 'Acid hydrolysis ⇌ acid + alcohol'}
          {mode === 'amine' && 'R–NH₂ + H⁺ → R–NH₃⁺'}
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          {mode === 'carbonyl' && 'Nucleophilic addition: HCN, NaBH₄, CN⁻'}
          {mode === 'ester' && 'Alkaline hydrolysis → carboxylate + alcohol'}
          {mode === 'amine' && 'With acyl chloride → amide'}
          {mode === 'alcohol' && 'Esterification: acid catalyst, equilibrium'}
          {mode === 'acid' && 'With carbonate → CO₂ + salt'}
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="138" width="280" height="52" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="158" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">State reagent + conditions for each conversion</text>
        <text x="210" y="176" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Tests: Tollens · Fehling · 2,4-DNPH · ester smell</text>
      </g>
    </svg>
  )
}
