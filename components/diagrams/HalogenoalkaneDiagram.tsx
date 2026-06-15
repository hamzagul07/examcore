'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '15-1-halogenoalkanes'

/** SN1/SN2 for 9701 topic 15.1. */
export function HalogenoalkaneDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Halogenoalkane nucleophilic substitution mechanisms">
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">Halogenoalkanes — C–X polar bond</text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <circle cx="210" cy="100" r="18" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="248" y="104" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="700">X</text>
        <text x="210" y="140" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>C δ+ — X δ− (leaving group ability I⁻ &gt; Br⁻ &gt; Cl⁻)</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <path d="M 160 100 L 200 100" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#sn-arr)" />
        <text x="140" y="88" fontSize="10" fill={DIAGRAM_TEXT}>Nu⁻</text>
        <text x="210" y="130" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>SN2: one step, backside attack, inversion</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="96" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>SN1: carbocation intermediate (tertiary favoured)</text>
        <text x="210" y="118" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Racemic mixture possible — racemisation</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="142" width="280" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="162" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Hot ethanolic OH⁻ → elimination competes</text>
        <text x="210" y="180" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Aqueous OH⁻ → substitution (reflux)</text>
      </g>
      <defs><marker id="sn-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} /></marker></defs>
    </svg>
  )
}
