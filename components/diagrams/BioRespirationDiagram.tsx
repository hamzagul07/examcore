'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '12-2-respiration'
const STAGES = [
  { t: 'Glycolysis', s: 'cytoplasm' },
  { t: 'Link & Krebs', s: 'matrix' },
  { t: 'Oxidative phos.', s: 'cristae' },
]

/** Aerobic respiration releases energy from glucose as ATP. */
export function BioRespirationDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Aerobic respiration releasing ATP from glucose">
      <defs>
        <marker id="bio-resp-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="210" y="38" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Glucose + O₂ → CO₂ + H₂O + ATP</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        {STAGES.map((st, i) => (
          <g key={st.t}>
            <rect x={18 + i * 134} y="78" width="116" height="50" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <text x={76 + i * 134} y="100" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">{st.t}</text>
            <text x={76 + i * 134} y="115" textAnchor="middle" fontSize="7.5" fill={DIAGRAM_TEXT}>{st.s}</text>
            {i < STAGES.length - 1 && (
              <line x1={134 + i * 134} y1="103" x2={150 + i * 134} y2="103" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#bio-resp-arrow)" />
            )}
          </g>
        ))}
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <rect x="130" y="150" width="160" height="36" rx="8" fill="var(--ink, var(--ec-brand))" fillOpacity="0.12" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="173" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">~32 ATP per glucose</text>
      </g>
      <text x="60" y="210" fontSize="9" fill={DIAGRAM_TEXT}>Most ATP is made on the inner mitochondrial membrane.</text>
    </svg>
  )
}
