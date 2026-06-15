'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '21-1-organic-synthesis'

export function OrganicSynthesisDiagram({ className = '', stepIndex = 0, lessonSlug = DEFAULT_SLUG }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const isALevel = lessonSlug.includes('36-1')

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Multi-step organic synthesis planning">
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">Organic synthesis — retrosynthesis</text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="280" y="70" width="80" height="36" rx="4" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="320" y="92" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>target</text>
        <path d="M 280 88 L 220 88" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#syn-arr)" />
        <rect x="120" y="70" width="80" height="36" rx="4" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="160" y="92" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>start</text>
        <text x="210" y="130" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>Work backwards from target functional group</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>Each arrow: reagent + conditions + intermediate</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isALevel ? 'Selectivity · stereochemistry · yield considerations' : '2–3 step routes from AS syllabus reagents'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="142" width="280" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="162" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Test-tube sequence confirms intermediates</text>
        <text x="210" y="180" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Tollens · Fehling · 2,4-DNPH · bromine water</text>
      </g>
      <defs><marker id="syn-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} /></marker></defs>
    </svg>
  )
}
