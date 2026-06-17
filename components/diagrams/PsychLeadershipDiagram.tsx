'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '4-2-1-traditional-and-modern-theories-of-leadership'
const STYLES = [
  { t: 'Autocratic', s: 'leader decides' },
  { t: 'Democratic', s: 'shared decisions' },
  { t: 'Laissez-faire', s: 'team decides' },
]

/** Leadership styles along a spectrum of control versus team freedom. */
export function PsychLeadershipDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Leadership styles spectrum">
      <line x1="40" y1="150" x2="384" y2="150" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="48" y="170" fontSize="8" fill={DIAGRAM_TEXT}>High leader control</text>
      <text x="300" y="170" fontSize="8" fill={DIAGRAM_TEXT}>Team freedom</text>
      {STYLES.map((s, i) => (
        <g key={s.t} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <rect x={24 + i * 130} y="56" width="116" height="56" rx="8" fill={i === 1 ? 'var(--ink, var(--ec-brand))' : DIAGRAM_FILL} fillOpacity={i === 1 ? 0.12 : 1} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x={82 + i * 130} y="82" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">{s.t}</text>
          <text x={82 + i * 130} y="98" textAnchor="middle" fontSize="7.5" fill={DIAGRAM_TEXT}>{s.s}</text>
          <line x1={82 + i * 130} y1="112" x2={82 + i * 130} y2="150" stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.5" />
        </g>
      ))}
      <text x="60" y="202" fontSize="9" fill={DIAGRAM_TEXT}>The best style depends on the task, team, and situation.</text>
    </svg>
  )
}
