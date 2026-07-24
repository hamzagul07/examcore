'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '5-2-linked-lists'
const NODE_FILL = 'color-mix(in srgb, var(--ec-brand) 12%, transparent)'

/**
 * A singly linked list — nodes holding a value plus a pointer to the next node.
 *
 * Stepped: the values, then the pointers that chain them (so nodes need not sit
 * together in memory), then the head that marks the start and the null pointer
 * that ends the list.
 */
export function LinkedListDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const op = (id: string) => layerOpacity(spec, stepIndex, id)

  const values = ['7', '3', '9', '4']
  const xs = values.map((_, i) => 22 + i * 106)
  const top = 82
  const h = 40
  const mid = top + h / 2 // 102

  return (
    <svg
      viewBox="0 0 440 190"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Singly linked list of nodes with data and next pointers"
    >
      {/* Nodes: data cells */}
      <g opacity={op('step-1')}>
        {values.map((v, i) => {
          const x = xs[i]
          return (
            <g key={i}>
              <rect x={x} y={top} width="78" height={h} rx="4" fill={NODE_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
              <line x1={x + 50} y1={top} x2={x + 50} y2={top + h} stroke={DIAGRAM_STROKE} strokeWidth="1" />
              <text x={x + 25} y={mid + 4} textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT}>{v}</text>
              <text x={x + 25} y={top - 5} textAnchor="middle" fontSize="7.5" fill={DIAGRAM_TEXT}>data</text>
              <text x={x + 64} y={top - 5} textAnchor="middle" fontSize="7.5" fill={DIAGRAM_TEXT}>next</text>
            </g>
          )
        })}
      </g>

      {/* Pointers: the links between nodes */}
      <g opacity={op('step-2')}>
        {values.slice(0, -1).map((_, i) => {
          const from = xs[i] + 64
          const to = xs[i + 1]
          return (
            <g key={i}>
              <circle cx={from} cy={mid} r="2.5" fill={DIAGRAM_TEXT} />
              <line x1={from} y1={mid} x2={to - 2} y2={mid} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
              <path d={`M${to - 8} ${mid - 4} L${to - 2} ${mid} L${to - 8} ${mid + 4}`} fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            </g>
          )
        })}
      </g>

      {/* Head + null terminator */}
      <g opacity={op('step-3')}>
        <text x={xs[0] + 25} y="44" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">head</text>
        <line x1={xs[0] + 25} y1="50" x2={xs[0] + 25} y2={top - 2} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <path d={`M${xs[0] + 21} ${top - 8} L${xs[0] + 25} ${top - 2} L${xs[0] + 29} ${top - 8}`} fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />

        {/* last next → null (diagonal slash) */}
        <circle cx={xs[3] + 64} cy={mid} r="2.5" fill={DIAGRAM_TEXT} />
        <line x1={xs[3] + 52} y1={top + h - 3} x2={xs[3] + 76} y2={top + 3} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x={xs[3] + 64} y={top + h + 14} textAnchor="middle" fontSize="8.5" fill={DIAGRAM_TEXT}>null</text>
      </g>

      <text x="220" y="176" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
        Follow the pointers from the head to traverse the list in order.
      </text>
    </svg>
  )
}
