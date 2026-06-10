'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '3-7-vectors'

export function VectorAdditionDiagram({
  className = '',
  stepIndex = 0,
  params,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const ax = params?.ax ?? 120
  const by = params?.by ?? 0
  const resultRef = useRef<SVGLineElement>(null)

  const x2a = 80 + ax
  const y2a = 140 - ax * 0.55
  const x2b = 80 + ax + 80
  const y2b = 140 + by
  const xR = x2b
  const yR = y2a

  useEffect(() => {
    const line = resultRef.current
    if (!line || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(line, { opacity: 0.3 }, { opacity: 1, duration: 0.35, ease: 'power2.out' })
  }, [stepIndex, ax, by])

  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Vector addition: resultant by parallelogram or nose-to-tail rule"
    >
      <line
        x1="80"
        y1="140"
        x2={x2a}
        y2={y2a}
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        markerEnd="url(#va-arr)"
        opacity={layerOpacity(spec, stepIndex, 'vector-a')}
      />
      <text x={80 + ax * 0.35} y={120 - by} fontSize="11" fill={DIAGRAM_TEXT}>
        a
      </text>
      <line
        x1="80"
        y1="140"
        x2={x2b}
        y2={y2b}
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        markerEnd="url(#va-arr)"
        opacity={layerOpacity(spec, stepIndex, 'vector-b')}
      />
      <text x={80 + ax * 0.6} y={155 + by} fontSize="11" fill={DIAGRAM_TEXT}>
        b
      </text>
      <line
        ref={resultRef}
        x1="80"
        y1="140"
        x2={xR}
        y2={yR}
        stroke={DIAGRAM_STROKE}
        strokeWidth="3"
        strokeDasharray="6 4"
        markerEnd="url(#va-arr)"
        opacity={layerOpacity(spec, stepIndex, 'resultant')}
      />
      <text x={xR + 8} y={yR} fontSize="12" fill={DIAGRAM_TEXT} fontWeight="700">
        R
      </text>
      <text
        x="210"
        y="28"
        textAnchor="middle"
        fontSize="13"
        fill={DIAGRAM_TEXT}
        fontWeight="700"
        opacity={layerOpacity(spec, stepIndex, 'rule', 1, 0.35)}
      >
        R = a + b (magnitude and direction)
      </text>
      <defs>
        <marker id="va-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
