'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '13-4-isomerism-structural-isomerism-and-stereoisomerism'

/** Structural and stereoisomerism for 9701 topic 13.4. */
export function IsomerismDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Structural and stereoisomerism">
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">Isomerism — same formula, different arrangement</text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line x1="100" y1="100" x2="200" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
        <line x1="240" y1="100" x2="320" y2="80" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
        <line x1="240" y1="100" x2="320" y2="120" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
        <text x="210" y="140" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>Structural: chain · position · functional group</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="150" y="96" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>C₂H₆O</text>
        <text x="150" y="118" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>ethanol</text>
        <text x="290" y="96" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>C₂H₆O</text>
        <text x="290" y="118" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>methoxymethane</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <line x1="160" y1="100" x2="220" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="3" />
        <line x1="190" y1="85" x2="190" y2="70" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <line x1="190" y1="115" x2="190" y2="130" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="210" y="148" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>E/Z isomerism — different groups on each C of C=C</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <circle cx="190" cy="100" r="16" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="190" y="104" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>*</text>
        <text x="210" y="168" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>Chiral centre: four different groups → optical isomers</text>
      </g>
    </svg>
  )
}
