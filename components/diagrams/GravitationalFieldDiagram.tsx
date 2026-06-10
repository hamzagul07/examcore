'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '13-3-gravitational-field-of-a-point-mass'

export function GravitationalFieldDiagram({
  className = '',
  stepIndex = 0,
  params,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)
  const M = params?.M ?? 5
  const r = params?.r ?? 75
  const massRadius = 12 + M * 1.2
  const cx = 210
  const cy = 110
  const arrowLen = Math.min(95, Math.max(35, r - 20))

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Gravitational field lines point toward the mass; field strength decreases with distance"
    >
      <circle
        cx={cx}
        cy={cy}
        r={massRadius}
        fill={DIAGRAM_STROKE}
        opacity={layerOpacity(spec, stepIndex, 'mass')}
      />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontSize="11"
        fill="white"
        fontWeight="700"
        opacity={layerOpacity(spec, stepIndex, 'mass')}
      >
        M
      </text>
      {[55, 75, 95].map((ring, i) => (
        <circle
          key={ring}
          cx={cx}
          cy={cy}
          r={ring}
          fill="none"
          stroke={DIAGRAM_STROKE}
          strokeWidth={ring === r ? 2.5 : 1.5}
          opacity={
            layerOpacity(spec, stepIndex, 'field-lines') * (ring === r ? 1 : 0.45 + i * 0.12)
          }
        />
      ))}
      <line
        x1={cx}
        y1={cy}
        x2={cx}
        y2={cy - arrowLen}
        stroke={DIAGRAM_STROKE}
        strokeWidth="2"
        opacity={layerOpacity(spec, stepIndex, 'field-strength')}
      />
      <polygon
        points={`${cx},${cy - arrowLen} ${cx - 8},${cy - arrowLen + 13} ${cx + 8},${cy - arrowLen + 13}`}
        fill={DIAGRAM_STROKE}
        opacity={layerOpacity(spec, stepIndex, 'field-strength')}
      />
      <text
        x={cx}
        y={24}
        textAnchor="middle"
        fontSize="13"
        fill={DIAGRAM_TEXT}
        fontWeight="700"
        opacity={layerOpacity(spec, stepIndex, 'field-strength', 1, 0.35)}
      >
        g = GM/r²
      </text>
      <text
        x={320}
        y={115}
        fontSize="12"
        fill={DIAGRAM_TEXT}
        fontWeight="600"
        opacity={layerOpacity(spec, stepIndex, 'force')}
      >
        F = GmM/r²
      </text>
      <text x={cx} y={205} textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
        r ≈ {r} · M scale ×{M}
      </text>
    </svg>
  )
}
