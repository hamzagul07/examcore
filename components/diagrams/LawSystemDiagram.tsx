'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-1-1-english-legal-system-and-its-context'

/** Sources of law and the split between civil and criminal courts. */
export function LawSystemDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Sources of law and the court system">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="156" y="34" width="108" height="30" rx="6" fill="var(--ink, var(--ec-brand))" fillOpacity="0.12" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="53" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Parliament</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1="210" y1="64" x2="210" y2="86" stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
        <rect x="156" y="86" width="108" height="28" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="104" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Judiciary &amp; precedent</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <line x1="210" y1="114" x2="210" y2="128" stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
        <line x1="120" y1="128" x2="300" y2="128" stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
        {[{ t: 'Civil courts', x: 60 }, { t: 'Criminal courts', x: 240 }].map((c) => (
          <g key={c.t}>
            <line x1={c.x + 60} y1="128" x2={c.x + 60} y2="142" stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
            <rect x={c.x} y="142" width="120" height="30" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <text x={c.x + 60} y="161" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>{c.t}</text>
          </g>
        ))}
      </g>
      <text x="60" y="206" fontSize="9" fill={DIAGRAM_TEXT}>Statute, case law, and ADR resolve disputes in the legal system.</text>
    </svg>
  )
}
