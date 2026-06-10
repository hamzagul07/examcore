'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '19-3-discharging-a-capacitor'

export function CapacitorDischargeDiagram({
  className = '',
  stepIndex = 0,
  params,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const R = params?.R ?? 10
  const C = params?.C ?? 100
  const tau = R * C
  const curveRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const curve = curveRef.current
    if (!curve || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(curve, { strokeDashoffset: 40 }, { strokeDashoffset: 0, duration: 0.5, ease: 'power1.out' })
  }, [stepIndex, R, C])

  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Capacitor discharge: potential difference decreases exponentially"
    >
      <line x1="50" y1="160" x2="370" y2="160" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <line x1="50" y1="160" x2="50" y2="40" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x="375" y="165" fontSize="12" fill={DIAGRAM_TEXT}>
        t
      </text>
      <text x="38" y="45" fontSize="12" fill={DIAGRAM_TEXT}>
        V
      </text>
      <path
        ref={curveRef}
        d="M 50 50 Q 120 52 180 80 T 320 145 L 370 155"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        strokeDasharray="40"
        opacity={layerOpacity(spec, stepIndex, 'curve')}
      />
      <g opacity={layerOpacity(spec, stepIndex, 'capacitor')}>
        <rect x="300" y="55" width="50" height="30" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="325" y="74" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          C
        </text>
      </g>
      <text
        x="210"
        y="28"
        textAnchor="middle"
        fontSize="12"
        fill={DIAGRAM_TEXT}
        fontWeight="600"
        opacity={layerOpacity(spec, stepIndex, 'formula', 1, 0.35)}
      >
        V = V₀ e^(−t/RC)
      </text>
      <text
        x="210"
        y="188"
        textAnchor="middle"
        fontSize="11"
        fill={DIAGRAM_TEXT}
        opacity={layerOpacity(spec, stepIndex, 'decay')}
      >
        τ = RC ≈ {tau} (arb. units) · larger R or C → slower decay
      </text>
    </svg>
  )
}
