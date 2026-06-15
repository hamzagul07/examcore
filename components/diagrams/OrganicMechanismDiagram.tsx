'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '13-2-characteristic-organic-reactions'

/** Core organic mechanisms for 9701 topic 13.2. */
export function OrganicMechanismDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Characteristic organic reactions and mechanisms">
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">Organic reaction types — Paper 2 mechanisms</text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="210" y="96" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">Free-radical substitution</text>
        <text x="210" y="118" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Alkane + X₂ → halogenoalkane (UV, chain mechanism)</text>
        <text x="210" y="136" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Initiation · propagation · termination</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1="120" y1="100" x2="180" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <line x1="180" y1="100" x2="210" y2="70" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="210" y="130" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>Electrophilic addition to C=C (e.g. HBr, Br₂)</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <path d="M 260 110 L 290 90 L 320 110" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="290" y="130" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Nu⁻</text>
        <text x="210" y="158" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>Nucleophilic substitution on C–X (SN1 / SN2)</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="142" width="280" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="162" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Oxidation: 1° alcohol → aldehyde → acid</text>
        <text x="210" y="180" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Curly arrows show electron pair movement in mechanisms</text>
      </g>
    </svg>
  )
}
