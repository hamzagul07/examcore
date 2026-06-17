'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '3-1-the-family'
const TYPES = [
  { t: 'Nuclear', x: 30, y: 44 },
  { t: 'Extended', x: 222, y: 44 },
  { t: 'Lone-parent', x: 30, y: 150 },
  { t: 'Reconstituted', x: 222, y: 150 },
]

/** Family diversity — a range of structures beyond the nuclear family. */
export function SocFamilyDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Diversity of family structures">
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <circle cx="210" cy="108" r="40" fill="var(--ink, var(--ec-brand))" fillOpacity="0.1" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="104" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">Family</text>
        <text x="210" y="117" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">diversity</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {TYPES.map((t) => (
          <g key={t.t}>
            <line x1="210" y1="108" x2={t.x + 84} y2={t.y + 22} stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.35" />
            <rect x={t.x} y={t.y} width="168" height="44" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <text x={t.x + 84} y={t.y + 28} textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">{t.t}</text>
          </g>
        ))}
      </g>
      <text x="60" y="226" fontSize="9" fill={DIAGRAM_TEXT}>Roles and structures vary by culture, class, and over time.</text>
    </svg>
  )
}
