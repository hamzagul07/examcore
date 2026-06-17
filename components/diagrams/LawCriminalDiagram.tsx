'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '3-1-1-criminal-liability'

/** Criminal liability requires actus reus and mens rea coinciding. */
export function LawCriminalDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Criminal liability: actus reus plus mens rea">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="34" y="64" width="130" height="50" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="99" y="86" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Actus reus</text>
        <text x="99" y="102" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>guilty act</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="200" y="94" textAnchor="middle" fontSize="16" fill={DIAGRAM_TEXT}>+</text>
        <rect x="236" y="64" width="130" height="50" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="301" y="86" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Mens rea</text>
        <text x="301" y="102" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>guilty mind</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <line x1="99" y1="114" x2="200" y2="148" stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.4" />
        <line x1="301" y1="114" x2="200" y2="148" stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.4" />
        <rect x="110" y="148" width="180" height="38" rx="8" fill="var(--ink, var(--ec-brand))" fillOpacity="0.12" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="200" y="172" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Criminal liability</text>
      </g>
      <text x="44" y="210" fontSize="9" fill={DIAGRAM_TEXT}>Both elements must coincide — plus causation, minus a valid defence.</text>
    </svg>
  )
}
