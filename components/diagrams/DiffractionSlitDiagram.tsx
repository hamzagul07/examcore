'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '8-4-the-diffraction-grating'

export function DiffractionSlitDiagram({
  className = '',
  stepIndex = 0,
  params,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)
  const slitWidth = params?.slit ?? 20
  const lambda = params?.lambda ?? 550
  const gapHeight = Math.max(18, Math.min(50, slitWidth + 8))
  const spread = Math.max(0.6, Math.min(1.4, 700 / lambda + (30 - slitWidth) / 40))
  const waveAmp = 18 * spread

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Diffraction grating: many slits create sharp interference maxima"
    >
      <text
        x={210}
        y={22}
        textAnchor="middle"
        fontSize="13"
        fill={DIAGRAM_TEXT}
        fontWeight="700"
        opacity={layerOpacity(spec, stepIndex, 'grating', 1, 0.35)}
      >
        d sin θ = nλ
      </text>

      {[160, 190, 220, 250].map((x, i) => (
        <g key={x} opacity={layerOpacity(spec, stepIndex, 'slit')}>
          <rect
            x={x}
            y={40}
            width={12}
            height={140}
            fill="none"
            stroke={DIAGRAM_STROKE}
            strokeWidth="2.5"
          />
          <rect
            x={x}
            y={110 - gapHeight / 2}
            width={12}
            height={gapHeight}
            fill="var(--ec-surface-muted)"
            stroke="none"
          />
          {i === 0 ? (
            <text x={x + 6} y={34} textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
              slits
            </text>
          ) : null}
        </g>
      ))}

      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={40}
          y1={70 + i * 15}
          x2={155}
          y2={70 + i * 15}
          stroke={DIAGRAM_STROKE}
          strokeWidth="1.5"
          opacity={layerOpacity(spec, stepIndex, 'spread') * (0.45 + i * 0.1)}
        />
      ))}

      <path
        d={`M 172 110 Q 230 ${110 - waveAmp} 290 110 Q 350 ${110 + waveAmp} 400 110`}
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2"
        opacity={layerOpacity(spec, stepIndex, 'interference')}
      />
      <path
        d={`M 172 110 Q 230 ${110 + waveAmp * 0.65} 290 110 Q 350 ${110 - waveAmp * 0.65} 400 110`}
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2"
        opacity={layerOpacity(spec, stepIndex, 'interference', 0.55, 0.15)}
      />

      {[280, 310, 340, 370].map((x, i) => (
        <line
          key={x}
          x1={x}
          y1={88}
          x2={x}
          y2={132}
          stroke={DIAGRAM_STROKE}
          strokeWidth={i % 2 === 0 ? 3 : 1}
          opacity={layerOpacity(spec, stepIndex, 'grating') * (i % 2 === 0 ? 1 : 0.35)}
        />
      ))}

      <text x={210} y={205} textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
        a ≈ {slitWidth} μm · λ = {lambda} nm
      </text>
    </svg>
  )
}
