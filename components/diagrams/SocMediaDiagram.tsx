'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '5-1-the-media'
const MODELS = [
  { t: 'Hypodermic', s: 'passive audience' },
  { t: 'Two-step flow', s: 'opinion leaders' },
  { t: 'Uses & gratifications', s: 'active audience' },
]

/** Media effects models — from a passive to an active audience. */
export function SocMediaDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Media effects models from passive to active audience">
      <defs>
        <marker id="soc-media-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      {MODELS.map((m, i) => (
        <g key={m.t} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <rect x={20 + i * 134} y="80" width="116" height="52" rx="8" fill={i === MODELS.length - 1 ? 'var(--ink, var(--ec-brand))' : DIAGRAM_FILL} fillOpacity={i === MODELS.length - 1 ? 0.12 : 1} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x={78 + i * 134} y="104" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">{m.t}</text>
          <text x={78 + i * 134} y="119" textAnchor="middle" fontSize="7.5" fill={DIAGRAM_TEXT}>{m.s}</text>
          {i < MODELS.length - 1 && (
            <line x1={136 + i * 134} y1="106" x2={152 + i * 134} y2="106" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#soc-media-arrow)" />
          )}
        </g>
      ))}
      <text x="40" y="166" fontSize="9" fill={DIAGRAM_TEXT}>Newer models give the audience more power over media messages.</text>
    </svg>
  )
}
