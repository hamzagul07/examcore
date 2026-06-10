'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '15-3-kinetic-theory-of-gases'

export function GasKineticDiagram({
  className = '',
  stepIndex = 0,
  params,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)
  const T = params?.T ?? 300
  const n = params?.n ?? 2
  const speedScale = Math.sqrt(T / 300)
  const count = Math.min(6, 3 + n)

  const particles = [
    { cx: 100, cy: 90, dx: 12, dy: -8 },
    { cx: 180, cy: 130, dx: -10, dy: 6 },
    { cx: 260, cy: 80, dx: 8, dy: 10 },
    { cx: 320, cy: 120, dx: -14, dy: -5 },
    { cx: 140, cy: 140, dx: 9, dy: -7 },
    { cx: 290, cy: 145, dx: -8, dy: 9 },
  ].slice(0, count)

  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Kinetic theory: gas particles in random motion exert pressure on container walls"
    >
      <rect
        x="70"
        y="50"
        width="280"
        height="120"
        rx="8"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        opacity={layerOpacity(spec, stepIndex, 'pressure', 1, 0.4)}
      />
      {particles.map((p, i) => (
        <g key={i} opacity={layerOpacity(spec, stepIndex, 'particles')}>
          <circle cx={p.cx} cy={p.cy} r="7" fill={DIAGRAM_STROKE} className="eq-anim-force-cw" />
          <line
            x1={p.cx}
            y1={p.cy}
            x2={p.cx + p.dx * speedScale}
            y2={p.cy + p.dy * speedScale}
            stroke={DIAGRAM_STROKE}
            strokeWidth="2"
            opacity={layerOpacity(spec, stepIndex, 'speed')}
            className={i % 2 === 0 ? 'eq-anim-vec-a' : 'eq-anim-vec-b'}
          />
        </g>
      ))}
      <text
        x="210"
        y="28"
        textAnchor="middle"
        fontSize="13"
        fill={DIAGRAM_TEXT}
        fontWeight="700"
        opacity={layerOpacity(spec, stepIndex, 'ideal', 1, 0.35)}
      >
        pV = nRT
      </text>
      <text x="210" y="188" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
        T = {T} K · n = {n} mol
      </text>
    </svg>
  )
}
