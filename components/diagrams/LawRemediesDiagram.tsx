'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '4-2-1-remedies'

/** Civil remedies split into common-law damages and equitable remedies. */
export function LawRemediesDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Civil remedies: damages and equitable remedies">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="150" y="34" width="120" height="30" rx="6" fill="var(--ink, var(--ec-brand))" fillOpacity="0.12" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="53" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Civil remedies</text>
        <line x1="210" y1="64" x2="210" y2="78" stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
        <line x1="110" y1="78" x2="310" y2="78" stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        {[{ t: 'Damages', s: 'compensatory · punitive', x: 30 }, { t: 'Equitable', s: 'injunction · specific perf.', x: 222 }].map((b, i) => (
          <g key={b.t}>
            <line x1={i === 0 ? 110 : 310} y1="78" x2={b.x + 84} y2="92" stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
            <rect x={b.x} y="92" width="168" height="50" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <text x={b.x + 84} y="114" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">{b.t}</text>
            <text x={b.x + 84} y="130" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>{b.s}</text>
          </g>
        ))}
      </g>
      <text x="50" y="176" fontSize="9" fill={DIAGRAM_TEXT}>Equitable remedies are discretionary — awarded where damages fall short.</text>
    </svg>
  )
}
