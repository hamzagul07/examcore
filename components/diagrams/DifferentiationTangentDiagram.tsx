'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-7-differentiation'

/** y = x^n tangent explorer for 9709 differentiation topics. */
export function DifferentiationTangentDiagram({
  className = '',
  stepIndex = 0,
  params,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const n = params?.n ?? 2
  const x0 = params?.x0 ?? 2
  const tangentRef = useRef<SVGLineElement>(null)
  const pointRef = useRef<SVGCircleElement>(null)

  const originX = 70
  const originY = 170
  const scale = 28
  const px = originX + x0 * scale
  const py = originY - Math.pow(x0, Math.min(n, 3)) * scale * (n > 2 ? 0.35 : 0.55)
  const slope = n * Math.pow(x0, n - 1)
  const tangentLen = 55

  useEffect(() => {
    const line = tangentRef.current
    const point = pointRef.current
    if (!line || !point || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.fromTo(
      [line, point],
      { opacity: 0.5 },
      { opacity: 1, duration: 0.35, ease: 'power2.out' }
    )
  }, [stepIndex, x0, n])

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Tangent to y equals x to the n at a point; gradient gives derivative"
    >
      <line x1={originX} y1={originY} x2={380} y2={originY} stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <line x1={originX} y1={originY} x2={originX} y2={40} stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="385" y="175" fontSize="12" fill={DIAGRAM_TEXT}>
        x
      </text>
      <text x="55" y="48" fontSize="12" fill={DIAGRAM_TEXT}>
        y
      </text>

      <path
        d={`M ${originX} ${originY} Q ${originX + 80} ${originY - 40} ${originX + 160} ${originY - 55} T ${originX + 280} ${originY - 95}`}
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        opacity={layerOpacity(spec, stepIndex, 'curve')}
      />

      <circle
        ref={pointRef}
        cx={px}
        cy={py}
        r="7"
        fill={DIAGRAM_FILL}
        stroke={DIAGRAM_STROKE}
        strokeWidth="2"
        opacity={layerOpacity(spec, stepIndex, 'tangent')}
      />

      <line
        ref={tangentRef}
        x1={px - tangentLen}
        y1={py + slope * tangentLen * 0.15}
        x2={px + tangentLen}
        y2={py - slope * tangentLen * 0.15}
        stroke={DIAGRAM_STROKE}
        strokeWidth="2"
        opacity={layerOpacity(spec, stepIndex, 'tangent')}
      />

      <text
        x="210"
        y="24"
        textAnchor="middle"
        fontSize="13"
        fill={DIAGRAM_TEXT}
        fontWeight="700"
        opacity={layerOpacity(spec, stepIndex, 'gradient', 1, 0.35)}
      >
        dy/dx = {n}x^{n - 1} at x = {x0}
      </text>
      <text
        x="210"
        y="205"
        textAnchor="middle"
        fontSize="11"
        fill={DIAGRAM_TEXT}
        opacity={layerOpacity(spec, stepIndex, 'rule')}
      >
        Power rule: d/dx(x^{n}) = {n}x^{n - 1}
      </text>
    </svg>
  )
}
