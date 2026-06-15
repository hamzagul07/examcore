'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '4-3-bit-manipulation'

function bitRow(bits: string[], y: number, highlight?: number) {
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
        fill={i === highlight ? 'color-mix(in srgb, var(--ec-brand) 18%, var(--course-surface))' : DIAGRAM_FILL}
        stroke={DIAGRAM_STROKE}
        strokeWidth={i === highlight ? 2.5 : 1.5}
      />
      <text
        x={startX + i * gap + 14}
        y={y + 18}
        textAnchor="middle"
        fontSize="12"
        fill={DIAGRAM_TEXT}
        fontWeight="600"
      >
        {bit}
      </text>
    </g>
  ))
}

export function BinaryShiftDiagram({
  className = '',
  stepIndex = 0,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Binary bit manipulation: shifts, masks, and two's complement"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'shift')}>
        <text x="48" y="36" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Logical shift left (×2)
        </text>
        {bitRow(['0', '1', '0', '1', '1', '0', '0', '0'], 44, 0)}
        <text x="48" y="92" fontSize="10" fill={DIAGRAM_TEXT}>
          Vacant bit filled with 0 · MSB lost on shift right
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'mask')}>
        <text x="48" y="112" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          AND mask 00001111 — clear upper nibble
        </text>
        {bitRow(['0', '0', '0', '0', '1', '1', '0', '0'], 120, 4)}
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'xor')}>
        <text x="48" y="168" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          XOR toggle — flip selected bits
        </text>
        {bitRow(['0', '1', '0', '1', '0', '1', '0', '1'], 176, 2)}
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'twos-complement')}>
        <rect x="260" y="44" width="140" height="72" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="330" y="68" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Two&apos;s complement
        </text>
        <text x="330" y="88" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          MSB = sign (0 +ve, 1 −ve)
        </text>
        <text x="330" y="106" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          −5 → invert + 1
        </text>
      </g>
    </svg>
  )
}
