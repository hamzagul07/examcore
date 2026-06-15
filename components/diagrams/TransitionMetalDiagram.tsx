'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '28-1-general-physical-and-chemical-properties-of-the-first-row-of-transition-elements-titanium-to-copper'

export function TransitionMetalDiagram({ className = '', stepIndex = 0, lessonSlug = DEFAULT_SLUG }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const mode = lessonSlug.includes('28-3') ? 'colour' : lessonSlug.includes('28-4') ? 'stereo' : lessonSlug.includes('28-5') ? 'kstab' : lessonSlug.includes('28-2') ? 'chem' : 'general'

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Transition metal chemistry">
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">Transition metals (Ti–Cu)</text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{mode === 'general' ? 'Variable oxidation states · coloured compounds · catalytic activity' : mode === 'chem' ? 'Complex ions · ligand exchange · redox of TM ions' : mode === 'colour' ? 'd–d transitions split by ligand field' : mode === 'stereo' ? 'Cis/trans · optical isomerism in octahedral complexes' : 'Kstab — stability of complex vs ligand exchange'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <circle cx="210" cy="100" r="24" stroke={DIAGRAM_STROKE} strokeWidth="2" fill="none" />
        <line x1="210" y1="76" x2="210" y2="58" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <line x1="234" y1="100" x2="252" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="210" y="104" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>M</text>
        <text x="210" y="140" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Octahedral [ML6]ⁿ⁺ common geometry</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{mode === 'colour' ? 'Weak-field vs strong-field ligands — ΔE different' : 'Partially filled d subshell — d-block definition'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="142" width="280" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="162" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Fe²⁺/Fe³³, Cu²⁺, MnO₄⁻ — know exam colours and reactions</text>
        <text x="210" y="180" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Catalysts: Fe in Haber · V₂O₅ in Contact process</text>
      </g>
    </svg>
  )
}
