'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '3-1-computers-and-their-components'

function box(
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sub?: string
) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 4 : h / 2 + 4)} textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
        {label}
      </text>
      {sub ? (
        <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          {sub}
        </text>
      ) : null}
    </g>
  )
}

export function CpuComponentsDiagram({
  className = '',
  stepIndex = 0,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)

  return (
    <svg
      viewBox="0 0 420 240"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Computer system components and fetch-decode-execute cycle"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'cpu')}>
        <rect x="130" y="48" width="160" height="96" rx="10" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
        <text x="210" y="68" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="700">
          CPU
        </text>
        {box(142, 78, 56, 52, 'ALU', 'arithmetic')}
        {box(208, 78, 70, 52, 'Control', 'decode')}
        <text x="210" y="138" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Fetch → Decode → Execute
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'memory')}>
        {box(36, 72, 72, 48, 'RAM', 'volatile')}
        {box(36, 132, 72, 48, 'ROM', 'boot')}
        <line x1="108" y1="96" x2="130" y2="96" stroke={DIAGRAM_STROKE} strokeWidth="1.5" markerEnd="url(#arrow)" />
        <line x1="108" y1="156" x2="130" y2="120" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'storage')}>
        {box(312, 72, 80, 48, 'SSD/HDD', 'secondary')}
        {box(312, 132, 80, 48, 'Cloud', 'backup')}
        <line x1="290" y1="96" x2="312" y2="96" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'io')}>
        {box(148, 168, 64, 44, 'Keyboard', 'input')}
        {box(228, 168, 64, 44, 'Monitor', 'output')}
        <line x1="180" y1="168" x2="180" y2="144" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <line x1="260" y1="168" x2="240" y2="144" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="228" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Von Neumann: single memory holds programs and data
        </text>
      </g>

      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <polygon points="0,0 6,3 0,6" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
