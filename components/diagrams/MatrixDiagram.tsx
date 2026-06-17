'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-4-matrices'

function cell(x: number, y: number, val: string, key: string) {
  return (
    <g key={key}>
      <rect x={x} y={y} width={36} height={28} fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x={x + 18} y={y + 18} textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
        {val}
      </text>
    </g>
  )
}

export function MatrixDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Matrix multiplication and transformations">
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="48" y="32" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">2 × 2 matrix</text>
        {[['a', 'b'], ['c', 'd']].map((row, ri) => row.map((v, ci) => cell(48 + ci * 40, 40 + ri * 32, v, `a-${ri}-${ci}`)))}
        <text x="140" y="72" fontSize="14" fill={DIAGRAM_STROKE}>×</text>
        {[['x'], ['y']].map((row, ri) => cell(168 + 0, 40 + ri * 32, row[0]!, `x-${ri}`))}
        <text x="220" y="72" fontSize="14" fill={DIAGRAM_STROKE}>=</text>
        {[['ax+by'], ['cx+dy']].map((row, ri) => cell(248, 40 + ri * 32, row[0]!, `r-${ri}`))}
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="48" y="120" fontSize="10" fill={DIAGRAM_TEXT}>AB ≠ BA in general — order matters</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="48" y="142" fontSize="10" fill={DIAGRAM_TEXT}>Identity I: AI = IA = A</text>
        <text x="48" y="160" fontSize="10" fill={DIAGRAM_TEXT}>Inverse A⁻¹ exists when det(A) ≠ 0</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="48" y="190" fontSize="10" fill={DIAGRAM_TEXT}>Transformations: rotation, reflection, stretch in 2D</text>
      </g>
    </svg>
  )
}
