'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '4-1-motivation-to-work'
const LEVELS = [
  { t: 'Physiological', half: 150 },
  { t: 'Safety', half: 122 },
  { t: 'Social', half: 94 },
  { t: 'Esteem', half: 66 },
  { t: 'Self-actualisation', half: 38 },
]

/** Maslow's hierarchy of needs — motivation at work builds from the base up. */
export function PsychWorkplaceDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  const cx = 210
  const baseY = 196
  const tierH = 32
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Maslow's hierarchy of needs">
      {LEVELS.map((lv, i) => {
        const topY = baseY - (i + 1) * tierH
        const botY = baseY - i * tierH
        const topHalf = LEVELS[i + 1]?.half ?? 24
        return (
          <g key={lv.t} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
            <polygon
              points={`${cx - lv.half},${botY} ${cx + lv.half},${botY} ${cx + topHalf},${topY} ${cx - topHalf},${topY}`}
              fill={i === LEVELS.length - 1 ? 'var(--ink, var(--ec-brand))' : 'none'}
              fillOpacity={i === LEVELS.length - 1 ? 0.14 : 1}
              stroke={DIAGRAM_STROKE}
              strokeWidth="1.5"
            />
            <text x={cx} y={(topY + botY) / 2 + 4} textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>{lv.t}</text>
          </g>
        )
      })}
      <text x="40" y="222" fontSize="9" fill={DIAGRAM_TEXT}>Lower needs are met first; managers motivate up the hierarchy.</text>
    </svg>
  )
}
