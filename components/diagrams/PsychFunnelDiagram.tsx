'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '2-1-the-decision-making-process'
const STAGES = ['Need recognition', 'Information search', 'Evaluation', 'Purchase', 'Post-purchase']

/** Consumer decision funnel narrowing from need to post-purchase. */
export function PsychFunnelDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Consumer decision-making funnel">
      {STAGES.map((s, i) => {
        const top = 36 + i * 34
        const inset = i * 30
        return (
          <g key={s} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
            <polygon
              points={`${70 + inset},${top} ${350 - inset},${top} ${330 - inset},${top + 26} ${90 + inset},${top + 26}`}
              fill={i === STAGES.length - 1 ? 'var(--ink, var(--ec-brand))' : 'none'}
              fillOpacity={i === STAGES.length - 1 ? 0.14 : 1}
              stroke={DIAGRAM_STROKE}
              strokeWidth="1.5"
            />
            <text x="210" y={top + 18} textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>{s}</text>
          </g>
        )
      })}
      <text x="78" y="226" fontSize="9" fill={DIAGRAM_TEXT}>Marketers target each stage to convert and retain buyers.</text>
    </svg>
  )
}
