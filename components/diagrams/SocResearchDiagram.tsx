'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '2-1-research-methods'

/** The positivist–interpretivist spectrum of sociological methods. */
export function SocResearchDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Positivist to interpretivist research spectrum">
      <line x1="56" y1="104" x2="364" y2="104" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <circle cx="56" cy="104" r="4" fill={DIAGRAM_TEXT} />
      <circle cx="364" cy="104" r="4" fill="var(--ink, var(--ec-brand))" />
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="56" y="86" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">Positivist</text>
        <text x="56" y="128" textAnchor="middle" fontSize="7.5" fill={DIAGRAM_TEXT}>quantitative</text>
        <text x="56" y="140" textAnchor="middle" fontSize="7.5" fill={DIAGRAM_TEXT}>reliable</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="364" y="86" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">Interpretivist</text>
        <text x="364" y="128" textAnchor="middle" fontSize="7.5" fill={DIAGRAM_TEXT}>qualitative</text>
        <text x="364" y="140" textAnchor="middle" fontSize="7.5" fill={DIAGRAM_TEXT}>valid</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="140" y="160" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>surveys · experiments</text>
        <text x="290" y="160" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>interviews · observation</text>
      </g>
      <text x="70" y="200" fontSize="9" fill={DIAGRAM_TEXT}>Method choice trades reliability against validity, plus ethics.</text>
    </svg>
  )
}
