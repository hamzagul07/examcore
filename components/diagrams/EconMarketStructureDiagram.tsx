'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '7-6-different-market-structures'

/** Monopoly: downward AR/MR with MC — profit-maximising where MC = MR. */
export function EconMarketStructureDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Monopoly profit maximisation where MC equals MR">
      <line x1="56" y1="190" x2="392" y2="190" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1="56" y1="190" x2="56" y2="28" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="22" y="34" fontSize="9" fill={DIAGRAM_TEXT}>P, C</text>
      <text x="350" y="206" fontSize="9" fill={DIAGRAM_TEXT}>Output</text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line x1="70" y1="55" x2="360" y2="170" stroke={DIAGRAM_TEXT} strokeWidth="2" />
        <text x="338" y="166" fontSize="9" fill={DIAGRAM_TEXT}>AR (D)</text>
        <line x1="70" y1="55" x2="252" y2="185" stroke={DIAGRAM_TEXT} strokeWidth="1.75" strokeDasharray="5 4" />
        <text x="150" y="150" fontSize="9" fill={DIAGRAM_TEXT}>MR</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <path d="M 80 150 Q 160 168 220 130 Q 300 86 360 50" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.25" />
        <text x="338" y="44" fontSize="10" fill={DIAGRAM_STROKE} fontWeight="600">MC</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <circle cx="178" cy="118" r="4" fill="var(--ink, var(--ec-brand))" />
        <line x1="178" y1="118" x2="178" y2="190" stroke={DIAGRAM_TEXT} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
        <text x="100" y="214" fontSize="9" fill={DIAGRAM_TEXT}>Profit max at MC = MR; price read off AR.</text>
      </g>
    </svg>
  )
}
