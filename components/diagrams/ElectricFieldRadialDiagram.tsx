'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '18-4-electric-field-of-a-point-charge'

export function ElectricFieldRadialDiagram({
  className = '',
  stepIndex = 0,
  params,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const Q = params?.Q ?? 1
  const rScale = params?.r ?? 95
  const lines = [0, 45, 90, 135, 180, 225, 270, 315]
  const chargeRef = useRef<SVGCircleElement>(null)

  useEffect(() => {
    const c = chargeRef.current
    if (!c || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(c, { scale: 0.92 }, { scale: 1, duration: 0.3, ease: 'power2.out', transformOrigin: '50% 50%' })
  }, [stepIndex, Q])

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Radial electric field lines from a positive point charge"
    >
      <circle
        ref={chargeRef}
        cx="210"
        cy="110"
        r={10 + Q * 2}
        fill={DIAGRAM_STROKE}
        opacity={layerOpacity(spec, stepIndex, 'charge')}
      />
      <text
        x="210"
        y="115"
        textAnchor="middle"
        fontSize="12"
        fill="white"
        fontWeight="700"
        opacity={layerOpacity(spec, stepIndex, 'charge')}
      >
        +
      </text>
      {lines.map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        const len = rScale * (0.65 + (i % 3) * 0.05)
        const x2 = 210 + Math.cos(rad) * len
        const y2 = 110 + Math.sin(rad) * len * 0.74
        return (
          <line
            key={deg}
            x1={210 + Math.cos(rad) * 18}
            y1={110 + Math.sin(rad) * 14}
            x2={x2}
            y2={y2}
            stroke={DIAGRAM_STROKE}
            strokeWidth="2"
            opacity={layerOpacity(spec, stepIndex, 'field-lines') * 0.85}
          />
        )
      })}
      <text
        x="210"
        y="28"
        textAnchor="middle"
        fontSize="13"
        fill={DIAGRAM_TEXT}
        fontWeight="700"
        opacity={layerOpacity(spec, stepIndex, 'formula', 1, 0.35)}
      >
        E = kQ/r²
      </text>
      <text
        x="210"
        y="200"
        textAnchor="middle"
        fontSize="11"
        fill={DIAGRAM_TEXT}
        opacity={layerOpacity(spec, stepIndex, 'direction')}
      >
        Field lines point away from + charge · Q scale ×{Q}
      </text>
    </svg>
  )
}
