'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '6-5-hypothesis-tests'

export function StatsAdvancedDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Advanced statistics: Poisson, inference, and hypothesis tests">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="48" y="36" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Poisson X ~ Po(λ)</text>
        <text x="48" y="54" fontSize="10" fill={DIAGRAM_TEXT}>P(X = r) = e⁻λ λʳ / r! · mean = variance = λ</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="48" y="88" fontSize="10" fill={DIAGRAM_TEXT}>E(aX + bY) = aE(X) + bE(Y)</text>
        <text x="48" y="106" fontSize="10" fill={DIAGRAM_TEXT}>Var(aX + bY) = a²Var(X) + b²Var(Y) if independent</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <path d="M 60 150 Q 140 60 220 55 T 360 150" fill="color-mix(in srgb, var(--ec-brand) 10%, var(--course-surface))" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <rect x="180" y="120" width="80" height="35" fill="color-mix(in srgb, var(--ec-brand) 20%, var(--course-surface))" stroke={DIAGRAM_STROKE} strokeWidth="1" />
        <text x="260" y="100" fontSize="9" fill={DIAGRAM_TEXT}>P(a &lt; X &lt; b) = area under PDF</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="48" y="168" width="324" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="186" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>H₀ vs H₁ · critical region · p-value</text>
        <text x="210" y="202" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Type I / II errors · CLT and confidence intervals</text>
      </g>
    </svg>
  )
}
