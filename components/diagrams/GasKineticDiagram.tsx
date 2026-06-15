'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacityAny } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '15-3-kinetic-theory-of-gases'

export function GasKineticDiagram({
  className = '',
  stepIndex = 0,
  params,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
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

  const boxW = lessonSlug.includes('4-1') ? 240 - stepIndex * 12 : 280
  const boxX = lessonSlug.includes('4-1') ? 90 + stepIndex * 6 : 70

  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Kinetic theory: gas particles in random motion exert pressure on container walls"
    >
      <rect
        x={boxX}
        y="50"
        width={boxW}
        height="120"
        rx="8"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        opacity={layerOpacityAny(spec, stepIndex, ['pressure', 'step-2', 'step-3'], 1, 0.4)}
      />
      {particles.map((p, i) => (
        <g key={i} opacity={layerOpacityAny(spec, stepIndex, ['particles', 'step-1'])}>
          <circle cx={p.cx} cy={p.cy} r="7" fill={DIAGRAM_STROKE} className="eq-anim-force-cw" />
          <line
            x1={p.cx}
            y1={p.cy}
            x2={p.cx + p.dx * speedScale}
            y2={p.cy + p.dy * speedScale}
            stroke={DIAGRAM_STROKE}
            strokeWidth="2"
            opacity={layerOpacityAny(spec, stepIndex, ['speed', 'step-1', 'step-3'])}
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
        opacity={layerOpacityAny(spec, stepIndex, ['ideal', 'step-4'], 1, 0.35)}
      >
        pV = nRT
      </text>
      <text
        x="210"
        y="188"
        textAnchor="middle"
        fontSize="11"
        fill={DIAGRAM_TEXT}
        opacity={layerOpacityAny(spec, stepIndex, ['ideal', 'step-2', 'step-3', 'step-4'], 1, 0.5)}
      >
        {lessonSlug.includes('4-1')
          ? `Boyle · Charles · Gay-Lussac · R = 8.31 J mol⁻¹ K⁻¹`
          : `T = ${T} K · n = ${n} mol`}
      </text>
    </svg>
  )
}
