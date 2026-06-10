'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '17-1-simple-harmonic-oscillations'

const STEP_POSITIONS = [
  { cx: 210, cy: 110 },
  { cx: 290, cy: 68 },
  { cx: 210, cy: 110 },
  { cx: 130, cy: 152 },
]

export function SimpleHarmonicMotionDiagram({
  className = '',
  stepIndex = 0,
  params,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)
  const A = params?.A ?? 0.6
  const amplitudePx = 40 + A * 35
  const dotRef = useRef<SVGCircleElement>(null)
  const base = STEP_POSITIONS[stepIndex % STEP_POSITIONS.length]
  const cx = stepIndex === 1 ? 210 + amplitudePx : stepIndex === 3 ? 210 - amplitudePx : base.cx
  const cy = stepIndex === 1 ? 110 - amplitudePx * 0.55 : stepIndex === 3 ? 110 + amplitudePx * 0.55 : base.cy

  useEffect(() => {
    const dot = dotRef.current
    if (!dot || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dot.setAttribute('cx', String(cx))
      dot.setAttribute('cy', String(cy))
      return
    }
    gsap.to(dot, {
      attr: { cx, cy },
      duration: 0.48,
      ease: 'power2.inOut',
    })
  }, [cx, cy, stepIndex])

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Simple harmonic motion: displacement varies sinusoidally with time"
    >
      <line x1="40" y1="170" x2="380" y2="170" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <line x1="40" y1="170" x2="40" y2="50" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="385" y="175" fontSize="12" fill={DIAGRAM_TEXT}>
        t
      </text>
      <text x="28" y="55" fontSize="12" fill={DIAGRAM_TEXT}>
        x
      </text>
      <path
        d="M 40 110 C 90 60, 130 60, 170 110 S 250 160, 290 110 S 370 60, 380 110"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        opacity={layerOpacity(spec, stepIndex, 'displacement')}
      />
      <circle
        ref={dotRef}
        cx={cx}
        cy={cy}
        r="7"
        fill={DIAGRAM_FILL}
        stroke={DIAGRAM_STROKE}
        strokeWidth="2"
        opacity={layerOpacity(spec, stepIndex, 'velocity')}
      />
      <line
        x1="40"
        y1="110"
        x2="380"
        y2="110"
        stroke={DIAGRAM_TEXT}
        strokeWidth="1"
        strokeDasharray="5 4"
        opacity={layerOpacity(spec, stepIndex, 'equilibrium', 0.5, 0.2)}
      />
      <text
        x="210"
        y="100"
        textAnchor="middle"
        fontSize="11"
        fill={DIAGRAM_TEXT}
        opacity={layerOpacity(spec, stepIndex, 'equilibrium')}
      >
        x = 0
      </text>
      <text
        x="210"
        y="205"
        textAnchor="middle"
        fontSize="12"
        fill={DIAGRAM_TEXT}
        fontWeight="600"
        opacity={layerOpacity(spec, stepIndex, 'period', 1, 0.35)}
      >
        x = {A.toFixed(1)} sin(ωt) — A = {A.toFixed(1)} m
      </text>
    </svg>
  )
}
