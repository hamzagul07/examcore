'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '1-1-data-representation'

function bitRow(bits: string[], y: number) {
  const startX = 72
  const gap = 36
  return bits.map((bit, i) => (
    <g key={`${y}-${i}`}>
      <rect
        x={startX + i * gap}
        y={y}
        width={28}
        height={28}
        rx="4"
        fill={DIAGRAM_FILL}
        stroke={DIAGRAM_STROKE}
        strokeWidth="1.5"
      />
      <text x={startX + i * gap + 14} y={y + 18} textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">
        {bit}
      </text>
    </g>
  ))
}

export function DataRepresentationDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Binary, denary, hex, and character encoding"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'binary-denary')}>
        <text x="48" y="32" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Denary ↔ binary (place value)
        </text>
        {bitRow(['0', '0', '0', '0', '1', '0', '1', '0'], 40)}
        <text x="48" y="88" fontSize="10" fill={DIAGRAM_TEXT}>
          00001010₂ = 10₁₀ · each bit doubles left to right
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'hex')}>
        <text x="48" y="112" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Hexadecimal (base 16)
        </text>
        <text x="48" y="132" fontSize="10" fill={DIAGRAM_TEXT}>
          0A₁₆ = 10₁₀ · one hex digit = 4 bits (nibble)
        </text>
        <rect x="260" y="104" width="120" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="320" y="126" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          FF₁₆ = 255₁₀
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'ascii')}>
        <text x="48" y="160" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          ASCII / Unicode — character codes
        </text>
        <text x="48" y="178" fontSize="10" fill={DIAGRAM_TEXT}>
          &apos;A&apos; = 65₁₀ = 01000001₂ · 7-bit ASCII, extended Unicode
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'twos-complement')}>
        <rect x="260" y="152" width="140" height="56" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="330" y="172" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Two&apos;s complement
        </text>
        <text x="330" y="190" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          MSB = sign · invert + 1 for negative
        </text>
      </g>
    </svg>
  )
}
