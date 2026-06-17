'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '2-2-the-physical-environment'
const CUES = [
  { t: 'Layout', x: 40, y: 40 },
  { t: 'Music', x: 300, y: 40 },
  { t: 'Lighting', x: 40, y: 150 },
  { t: 'Scent', x: 300, y: 150 },
]

/** Retail atmospherics — environmental cues steer the shopper's path. */
export function PsychRetailDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Retail atmospherics steering shopper behaviour">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="140" y="56" width="140" height="120" rx="10" fill="var(--ink, var(--ec-brand))" fillOpacity="0.08" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="100" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Store</text>
        <path d="M 168 160 C 180 120, 240 130, 252 92" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.75" strokeDasharray="4 3" />
        <text x="210" y="150" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>shopper path</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        {CUES.map((c) => (
          <g key={c.t}>
            <rect x={c.x} y={c.y} width="80" height="28" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
            <text x={c.x + 40} y={c.y + 18} textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>{c.t}</text>
          </g>
        ))}
      </g>
      <text x="66" y="206" fontSize="9" fill={DIAGRAM_TEXT}>Atmospheric cues nudge mood, dwell time, and spending.</text>
    </svg>
  )
}
