'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-1-2-explanations-of-schizophrenia'

/** Diathesis-stress: vulnerability plus life stress crosses the disorder threshold. */
export function PsychDiathesisDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Diathesis-stress model crossing the disorder threshold">
      <line x1="56" y1="190" x2="392" y2="190" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1="56" y1="190" x2="56" y2="28" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1="56" y1="78" x2="392" y2="78" stroke={DIAGRAM_TEXT} strokeWidth="1.5" strokeDasharray="6 4" />
      <text x="250" y="72" fontSize="9" fill={DIAGRAM_TEXT}>Disorder threshold</text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="110" y="130" width="60" height="60" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="140" y="206" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>Vulnerability</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="110" y="64" width="60" height="66" fill="var(--ink, var(--ec-brand))" fillOpacity="0.18" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="270" y="120" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>+ Life stress pushes total</text>
        <text x="270" y="134" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>past the threshold</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="60" y="216" fontSize="9" fill={DIAGRAM_TEXT}>Low vulnerability needs high stress to trigger onset — and vice versa.</text>
      </g>
    </svg>
  )
}
