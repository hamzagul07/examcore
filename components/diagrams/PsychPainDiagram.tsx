'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '3-3-1-types-and-theories-of-pain'

/** Gate control theory — a spinal "gate" modulates pain signals to the brain. */
export function PsychPainDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Gate control theory of pain">
      <defs>
        <marker id="psy-pain-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="22" y="86" width="92" height="44" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="68" y="105" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Tissue</text>
        <text x="68" y="119" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>damage</text>
        <line x1="114" y1="108" x2="150" y2="108" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#psy-pain-arrow)" />
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <circle cx="186" cy="108" r="32" fill="var(--ink, var(--ec-brand))" fillOpacity="0.1" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="186" y="104" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">Gate</text>
        <text x="186" y="118" textAnchor="middle" fontSize="7.5" fill={DIAGRAM_TEXT}>open / closed</text>
        <line x1="218" y1="108" x2="254" y2="108" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#psy-pain-arrow)" />
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <rect x="256" y="86" width="120" height="44" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="316" y="105" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Brain</text>
        <text x="316" y="119" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>pain perceived</text>
        <text x="186" y="58" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>Attention, mood, and beliefs open or close the gate</text>
      </g>
      <text x="60" y="170" fontSize="9" fill={DIAGRAM_TEXT}>Psychological factors modulate how much pain reaches the brain.</text>
    </svg>
  )
}
