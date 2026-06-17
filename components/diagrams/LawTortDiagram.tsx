'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '4-1-1-negligence'
const CHAIN = ['Duty of care', 'Breach', 'Causation', 'Damage']

/** Negligence: each link must be proven for liability. */
export function LawTortDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Negligence chain: duty, breach, causation, damage">
      <defs>
        <marker id="law-tort-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      {CHAIN.map((c, i) => (
        <g key={c} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <rect x={20 + i * 98} y="86" width="82" height="44" rx="8" fill={i === CHAIN.length - 1 ? 'var(--ink, var(--ec-brand))' : DIAGRAM_FILL} fillOpacity={i === CHAIN.length - 1 ? 0.12 : 1} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x={61 + i * 98} y="112" textAnchor="middle" fontSize="8.5" fill={DIAGRAM_TEXT}>{c}</text>
          {i < CHAIN.length - 1 && (
            <line x1={102 + i * 98} y1="108" x2={118 + i * 98} y2="108" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#law-tort-arrow)" />
          )}
        </g>
      ))}
      <text x="50" y="166" fontSize="9" fill={DIAGRAM_TEXT}>Claimant must establish every link to succeed in negligence.</text>
    </svg>
  )
}
