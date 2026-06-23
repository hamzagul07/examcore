'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'

const ELEMENTS = [
  { name: 'Line', hint: 'Direction, movement, contour' },
  { name: 'Shape', hint: '2D enclosed area' },
  { name: 'Form', hint: '3D volume and mass' },
  { name: 'Colour', hint: 'Hue, value, intensity' },
  { name: 'Value', hint: 'Light and dark contrast' },
  { name: 'Texture', hint: 'Surface quality' },
  { name: 'Space', hint: 'Positive / negative areas' },
]

export function FormalElementsDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const visible = Math.min(ELEMENTS.length, stepIndex + 2)

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Formal elements of visual art"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="700">
        Formal elements for comparative study
      </text>
      {ELEMENTS.slice(0, visible).map((el, i) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        const x = 24 + col * 200
        const y = 44 + row * 52
        return (
          <g key={el.name}>
            <rect x={x} y={y} width="188" height="44" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <text x={x + 12} y={y + 20} fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
              {el.name}
            </text>
            <text x={x + 12} y={y + 34} fontSize="8.5" fill={DIAGRAM_TEXT}>
              {el.hint}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
