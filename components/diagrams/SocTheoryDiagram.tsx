'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-1-the-process-of-learning-and-socialisation'

/** Sociological perspectives mapped on structure–agency and consensus–conflict. */
export function SocTheoryDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Sociological perspectives: structure vs agency, consensus vs conflict">
      <line x1="210" y1="44" x2="210" y2="176" stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
      <line x1="56" y1="110" x2="364" y2="110" stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
      <text x="210" y="38" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>Structure</text>
      <text x="210" y="190" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>Agency</text>
      <text x="70" y="106" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>Consensus</text>
      <text x="350" y="106" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>Conflict</text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="130" y="80" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">Functionalism</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="296" y="80" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">Marxism / Feminism</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <rect x="138" y="138" width="144" height="26" rx="6" fill="var(--ink, var(--ec-brand))" fillOpacity="0.1" stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
        <text x="210" y="155" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">Interactionism</text>
      </g>
      <text x="60" y="214" fontSize="9" fill={DIAGRAM_TEXT}>Perspectives explain structure, agency, and social change.</text>
    </svg>
  )
}
