'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '33-3-acyl-chlorides'

export function ALevelOrganicDiagram({ className = '', stepIndex = 0, lessonSlug = DEFAULT_SLUG }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const mode = lessonSlug.includes('34-2') ? 'azo' : lessonSlug.includes('34-3') ? 'amide' : lessonSlug.includes('34-4') ? 'amino' : 'acyl'

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="A Level organic: acyl chlorides, amines, amides, amino acids">
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        {mode === 'acyl' ? 'Acyl chlorides — R–COCl' : mode === 'azo' ? 'Phenylamine & azo compounds' : mode === 'amide' ? 'Amides — R–CONH₂' : 'Amino acids & zwitterions'}
      </text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{mode === 'acyl' ? 'Reactive acid derivative — fumes in moist air' : mode === 'azo' ? 'Diazonium salt + phenol → azo dye' : mode === 'amide' ? 'From acyl chloride + NH₃ (or amine)' : 'H₂N–CH(R)–COOH — amphoteric'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{mode === 'acyl' ? 'With alcohol → ester · with amine → amide · hydrolysis fast' : mode === 'amino' ? 'Peptide link –CO–NH– by condensation' : 'Nucleophilic acyl substitution mechanism'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{mode === 'azo' ? 'Coupling reaction — coloured product (dyestuffs)' : mode === 'amino' ? 'Isoelectric point — zwitterion at specific pH' : 'HCl generated — use in fume cupboard'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="142" width="280" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="162" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">State reagent, conditions, and type of mechanism</text>
        <text x="210" y="180" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Acyl chloride &gt; acid anhydride &gt; ester &gt; acid reactivity</text>
      </g>
    </svg>
  )
}
