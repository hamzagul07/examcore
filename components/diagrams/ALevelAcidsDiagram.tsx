'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '25-1-acids-and-bases'

export function ALevelAcidsDiagram({ className = '', stepIndex = 0, lessonSlug = DEFAULT_SLUG }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const isPartition = lessonSlug.includes('25-2')

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="A Level acids, bases, and partition coefficients">
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">{isPartition ? 'Partition coefficients' : 'A Level acids & bases'}</text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isPartition ? 'Kpc = [X] in organic / [X] in aqueous' : 'Ka · Kb · Kw — link via Kw = Ka × Kb (conjugate pair)'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isPartition ? 'Non-polar solute prefers organic layer' : 'pH buffers: weak acid + conjugate base (Henderson–Hasselbalch)'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isPartition ? 'Extraction and solubility in two immiscible solvents' : 'Titration curves — equivalence point · indicator choice'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="142" width="280" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="162" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">{isPartition ? 'Calculate concentration in each layer at equilibrium' : 'pKa + pKb = pKw at 298 K'}</text>
      </g>
    </svg>
  )
}
