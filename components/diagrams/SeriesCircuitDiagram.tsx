'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '10-1-practical-circuits'

export function SeriesCircuitDiagram({
  className = '',
  stepIndex = 0,
  params,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)
  const R1 = params?.R1 ?? 4
  const R2 = params?.R2 ?? 6
  const totalR = R1 + R2
  const r1Width = 36 + R1 * 2
  const r2Width = 36 + R2 * 2

  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Series circuit: same current through each component"
    >
      <rect
        x="60"
        y="70"
        width="300"
        height="60"
        rx="8"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        opacity={layerOpacity(spec, stepIndex, 'series', 1, 0.35)}
      />
      <g opacity={layerOpacity(spec, stepIndex, 'supply')}>
        <circle cx="72" cy="100" r="10" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="72" y="104" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          +
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'series')}>
        <rect
          x={118}
          y={88}
          width={r1Width}
          height={24}
          rx={4}
          fill={DIAGRAM_FILL}
          stroke={DIAGRAM_STROKE}
          strokeWidth="2"
        />
        <text x={118 + r1Width / 2} y={104} textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          R₁={R1}Ω
        </text>
        <rect
          x={200}
          y={88}
          width={r2Width}
          height={24}
          rx={4}
          fill={DIAGRAM_FILL}
          stroke={DIAGRAM_STROKE}
          strokeWidth="2"
        />
        <text x={200 + r2Width / 2} y={104} textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          R₂={R2}Ω
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'pd')}>
        <circle cx="330" cy="100" r="14" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="330" y="104" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          V
        </text>
      </g>
      <circle className="eq-anim-force-cw" cx="72" cy="100" r="5" fill={DIAGRAM_STROKE} opacity={0.5} />
      <circle className="eq-anim-force-acw" cx="348" cy="100" r="5" fill={DIAGRAM_STROKE} opacity={0.5} />
      <text
        x="210"
        y="168"
        textAnchor="middle"
        fontSize="12"
        fill={DIAGRAM_TEXT}
        fontWeight="600"
        opacity={layerOpacity(spec, stepIndex, 'measure', 1, 0.35)}
      >
        R_total = {totalR} Ω · I same everywhere in series
      </text>
    </svg>
  )
}
