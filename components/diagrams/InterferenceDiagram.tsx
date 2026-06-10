'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '8-3-interference'

export function InterferenceDiagram({
  className = '',
  stepIndex = 0,
  params,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const lambda = params?.lambda ?? 550
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const path = pathRef.current
    if (!path || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(path, { opacity: 0.4 }, { opacity: 0.95, duration: 0.35, ease: 'power2.out' })
  }, [stepIndex, lambda])

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Two-source interference: path difference determines constructive or destructive fringes"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'sources')}>
        <circle cx="60" cy="110" r="6" fill={DIAGRAM_STROKE} />
        <circle cx="60" cy="90" r="4" fill={DIAGRAM_STROKE} opacity="0.6" />
        <circle cx="60" cy="130" r="4" fill={DIAGRAM_STROKE} opacity="0.6" />
        <text x="130" y="88" fontSize="11" fill={DIAGRAM_TEXT}>
          S₁
        </text>
        <text x="130" y="138" fontSize="11" fill={DIAGRAM_TEXT}>
          S₂
        </text>
      </g>
      <path
        d="M 60 110 Q 140 70 220 110"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2"
        opacity={layerOpacity(spec, stepIndex, 'path') * 0.85}
      />
      <path
        ref={pathRef}
        d="M 60 110 Q 140 150 220 110"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2"
        opacity={layerOpacity(spec, stepIndex, 'path') * 0.85}
      />
      <line
        x1="220"
        y1="60"
        x2="220"
        y2="160"
        stroke={DIAGRAM_TEXT}
        strokeWidth="1.5"
        strokeDasharray="4 3"
        opacity={layerOpacity(spec, stepIndex, 'bright', 0.8, 0.25)}
      />
      <text x="232" y="115" fontSize="11" fill={DIAGRAM_TEXT}>
        screen
      </text>
      <text
        x="210"
        y="48"
        textAnchor="middle"
        fontSize="11"
        fill={DIAGRAM_TEXT}
        fontWeight="600"
        opacity={layerOpacity(spec, stepIndex, 'bright')}
      >
        bright (Δ = nλ)
      </text>
      <text
        x="210"
        y="178"
        textAnchor="middle"
        fontSize="11"
        fill={DIAGRAM_TEXT}
        fontWeight="600"
        opacity={layerOpacity(spec, stepIndex, 'dark')}
      >
        dark (Δ = (n+½)λ)
      </text>
      <text x="210" y="210" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
        λ = {lambda} nm
      </text>
    </svg>
  )
}
