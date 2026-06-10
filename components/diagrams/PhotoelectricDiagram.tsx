'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '22-2-photoelectric-effect'

export function PhotoelectricDiagram({
  className = '',
  stepIndex = 0,
  params,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const freq = params?.f ?? 550
  const electronRef = useRef<SVGCircleElement>(null)

  useEffect(() => {
    const e = electronRef.current
    if (!e || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(e, { attr: { cx: 200 } }, { attr: { cx: 220 }, duration: 0.4, ease: 'power2.out' })
  }, [stepIndex, freq])

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Photoelectric effect: photon energy must exceed work function to release electrons"
    >
      <rect
        x="60"
        y="130"
        width="300"
        height="50"
        rx="4"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2"
        opacity={layerOpacity(spec, stepIndex, 'surface')}
      />
      <text
        x="210"
        y="160"
        textAnchor="middle"
        fontSize="11"
        fill={DIAGRAM_TEXT}
        opacity={layerOpacity(spec, stepIndex, 'surface')}
      >
        metal surface (work function Φ)
      </text>
      <g opacity={layerOpacity(spec, stepIndex, 'photon')}>
        <line x1="120" y1="60" x2="160" y2="125" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <polygon points="160,125 152,112 168,112" fill={DIAGRAM_STROKE} />
        <text x="105" y="55" fontSize="11" fill={DIAGRAM_TEXT}>
          hf = {Math.round(freq * 0.004)} eV scale
        </text>
      </g>
      <circle
        ref={electronRef}
        cx="200"
        cy="115"
        r="6"
        fill={DIAGRAM_STROKE}
        opacity={layerOpacity(spec, stepIndex, 'electron')}
      />
      <path
        d="M 206 112 L 250 80"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2"
        opacity={layerOpacity(spec, stepIndex, 'electron')}
      />
      <text x="255" y="75" fontSize="11" fill={DIAGRAM_TEXT} opacity={layerOpacity(spec, stepIndex, 'electron')}>
        e⁻
      </text>
      <text
        x="210"
        y="28"
        textAnchor="middle"
        fontSize="13"
        fill={DIAGRAM_TEXT}
        fontWeight="700"
        opacity={layerOpacity(spec, stepIndex, 'formula', 1, 0.35)}
      >
        KEmax = hf − Φ
      </text>
      <text x="210" y="205" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
        Intensity ↑ → more electrons, not higher KEmax
      </text>
    </svg>
  )
}
