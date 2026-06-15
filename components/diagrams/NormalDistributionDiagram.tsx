'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '5-5-the-normal-distribution'

export function NormalDistributionDiagram({
  className = '',
  stepIndex = 0,
  params,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const mu = params?.mu ?? 0
  const sigma = params?.sigma ?? 1
  const ox = 60
  const oy = 160
  const scale = 40

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Normal distribution bell curve">
      <line x1={ox} y1={oy} x2={380} y2={oy} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <path
          d={`M ${ox} ${oy} Q ${ox + 80} ${oy - 90} ${ox + 160} ${oy - 95} T ${ox + 320} ${oy}`}
          fill="color-mix(in srgb, var(--ec-brand) 12%, var(--course-surface))"
          stroke={DIAGRAM_STROKE}
          strokeWidth="2"
        />
        <text x="210" y="24" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">X ~ N(μ, σ²)</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1={ox + 160} y1={oy - 95} x2={ox + 160} y2={oy} stroke={DIAGRAM_STROKE} strokeWidth="2" strokeDasharray="4 3" />
        <text x={ox + 160} y={oy + 16} textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>μ = {mu}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="260" y="100" fontSize="10" fill={DIAGRAM_TEXT}>σ controls spread (σ = {sigma})</text>
        <text x="260" y="118" fontSize="9" fill={DIAGRAM_TEXT}>68% within μ ± σ</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="48" y="200" fontSize="10" fill={DIAGRAM_TEXT}>Standardise: Z = (X − μ)/σ ~ N(0, 1)</text>
      </g>
    </svg>
  )
}
