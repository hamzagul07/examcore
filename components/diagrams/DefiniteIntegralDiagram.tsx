'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '3-5-integration'

/** Shaded area under a curve for definite integrals (9709). */
export function DefiniteIntegralDiagram({
  className = '',
  stepIndex = 0,
  params,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const a = params?.a ?? 1
  const b = params?.b ?? 4
  const originX = 60
  const originY = 170
  const scale = 32
  const ax = originX + a * scale
  const bx = originX + b * scale
  const shadeRef = useRef<SVGPathElement>(null)

  const curve = (x: number) => originY - (0.15 * (x - originX) * (x - originX)) / scale - 20

  useEffect(() => {
    const shade = shadeRef.current
    if (!shade || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(shade, { opacity: 0.2 }, { opacity: 0.45, duration: 0.4, ease: 'power2.out' })
  }, [stepIndex, a, b])

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Definite integral as signed area under a curve between limits a and b"
    >
      <line x1={originX} y1={originY} x2={380} y2={originY} stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <line x1={originX} y1={originY} x2={originX} y2={45} stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="385" y="175" fontSize="12" fill={DIAGRAM_TEXT}>
        x
      </text>
      <text x="48" y="52" fontSize="12" fill={DIAGRAM_TEXT}>
        y
      </text>

      <path
        d={`M ${originX} ${curve(originX)} Q ${originX + 100} ${curve(originX + 100)} ${originX + 200} ${curve(originX + 200)} T ${originX + 300} ${curve(originX + 300)}`}
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        opacity={layerOpacity(spec, stepIndex, 'curve')}
      />

      <path
        ref={shadeRef}
        d={`M ${ax} ${originY} L ${ax} ${curve(ax)} Q ${(ax + bx) / 2} ${curve((ax + bx) / 2)} ${bx} ${curve(bx)} L ${bx} ${originY} Z`}
        fill={DIAGRAM_STROKE}
        opacity={layerOpacity(spec, stepIndex, 'area', 0.45, 0.12)}
      />

      <line
        x1={ax}
        y1={originY}
        x2={ax}
        y2={50}
        stroke={DIAGRAM_TEXT}
        strokeWidth="1.5"
        strokeDasharray="4 3"
        opacity={layerOpacity(spec, stepIndex, 'limits')}
      />
      <line
        x1={bx}
        y1={originY}
        x2={bx}
        y2={50}
        stroke={DIAGRAM_TEXT}
        strokeWidth="1.5"
        strokeDasharray="4 3"
        opacity={layerOpacity(spec, stepIndex, 'limits')}
      />
      <text x={ax} y="188" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
        a={a}
      </text>
      <text x={bx} y="188" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
        b={b}
      </text>

      <text
        x="210"
        y="24"
        textAnchor="middle"
        fontSize="13"
        fill={DIAGRAM_TEXT}
        fontWeight="700"
        opacity={layerOpacity(spec, stepIndex, 'integral', 1, 0.35)}
      >
        ∫ₐᵇ f(x) dx = area under curve
      </text>
      <text
        x="210"
        y="205"
        textAnchor="middle"
        fontSize="11"
        fill={DIAGRAM_TEXT}
        opacity={layerOpacity(spec, stepIndex, 'parts')}
      >
        Limits: x = {a} to x = {b}
      </text>
    </svg>
  )
}
