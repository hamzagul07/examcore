'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-2-1-judicial-precedent'
const COURTS = ['Supreme Court', 'Court of Appeal', 'High Court']

/** Stare decisis: higher courts bind lower courts through the hierarchy. */
export function LawPrecedentDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Court hierarchy binding precedent">
      <defs>
        <marker id="law-prec-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      {COURTS.map((c, i) => (
        <g key={c} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <rect x={110} y={44 + i * 52} width="200" height="34" rx="6" fill={i === 0 ? 'var(--ink, var(--ec-brand))' : DIAGRAM_FILL} fillOpacity={i === 0 ? 0.12 : 1} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x="210" y={65 + i * 52} textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">{c}</text>
          {i < COURTS.length - 1 && (
            <line x1="210" y1={78 + i * 52} x2="210" y2={94 + i * 52} stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#law-prec-arrow)" />
          )}
          {i < COURTS.length - 1 && (
            <text x="226" y={90 + i * 52} fontSize="8" fill={DIAGRAM_TEXT}>binds</text>
          )}
        </g>
      ))}
      <text x="50" y="212" fontSize="9" fill={DIAGRAM_TEXT}>Lower courts follow the ratio decidendi of higher courts.</text>
    </svg>
  )
}
