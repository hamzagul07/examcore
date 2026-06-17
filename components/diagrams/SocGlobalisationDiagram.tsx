'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '6-1-globalisation'
const NODES = [
  { t: 'Economic', x: 90, y: 56 },
  { t: 'Cultural', x: 330, y: 56 },
  { t: 'Political', x: 90, y: 168 },
  { t: 'Migration', x: 330, y: 168 },
]

/** Globalisation links societies through economic, cultural, and political flows. */
export function SocGlobalisationDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Globalisation flows linking societies">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {NODES.map((n) => (
          <line key={`l-${n.t}`} x1="210" y1="112" x2={n.x} y2={n.y} stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.4" />
        ))}
        <circle cx="210" cy="112" r="38" fill="var(--ink, var(--ec-brand))" fillOpacity="0.1" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="116" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Global</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        {NODES.map((n) => (
          <g key={n.t}>
            <circle cx={n.x} cy={n.y} r="24" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <text x={n.x} y={n.y + 3} textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>{n.t}</text>
          </g>
        ))}
      </g>
      <text x="60" y="224" fontSize="9" fill={DIAGRAM_TEXT}>Flows reshape identity, power, inequality, and migration.</text>
    </svg>
  )
}
