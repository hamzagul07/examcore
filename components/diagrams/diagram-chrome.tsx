import type { ReactNode } from 'react'
import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

/** Light grid + axis frame for live lesson diagrams. */
export function DiagramGrid({
  x0,
  y0,
  x1,
  y1,
  xLabel,
  yLabel,
  columns = 8,
  rows = 5,
}: {
  x0: number
  y0: number
  x1: number
  y1: number
  xLabel?: string
  yLabel?: string
  columns?: number
  rows?: number
}) {
  const lines: ReactNode[] = []
  for (let c = 1; c < columns; c++) {
    const x = x0 + ((x1 - x0) * c) / columns
    lines.push(
      <line key={`v${c}`} x1={x} y1={y1} x2={x} y2={y0} stroke={DIAGRAM_STROKE} strokeWidth="0.5" opacity="0.12" />
    )
  }
  for (let r = 1; r < rows; r++) {
    const y = y0 - ((y0 - y1) * r) / rows
    lines.push(
      <line key={`h${r}`} x1={x0} y1={y} x2={x1} y2={y} stroke={DIAGRAM_STROKE} strokeWidth="0.5" opacity="0.12" />
    )
  }
  return (
    <g aria-hidden="true">
      {lines}
      <line x1={x0} y1={y0} x2={x1} y2={y0} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1={x0} y1={y0} x2={x0} y2={y1} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      {xLabel ? (
        <text x={x1 - 4} y={y0 + 16} textAnchor="end" fontSize="9" fill={DIAGRAM_TEXT}>
          {xLabel}
        </text>
      ) : null}
      {yLabel ? (
        <text x={x0 - 8} y={y1 + 4} textAnchor="end" fontSize="9" fill={DIAGRAM_TEXT}>
          {yLabel}
        </text>
      ) : null}
    </g>
  )
}

export function DiagramArrow({
  x1,
  y1,
  x2,
  y2,
  opacity = 1,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  opacity?: number
}) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const tip = 7
  const bx = x2 - ux * tip
  const by = y2 - uy * tip
  const px = -uy * 4
  const py = ux * 4
  return (
    <g opacity={opacity}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <polygon
        points={`${x2},${y2} ${bx + px},${by + py} ${bx - px},${by - py}`}
        fill={DIAGRAM_STROKE}
      />
    </g>
  )
}
