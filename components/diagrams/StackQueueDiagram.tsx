'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '5-4-stacks-queues-and-the-application-of-data-structures'
const ELEM_FILL = 'color-mix(in srgb, var(--ec-brand) 12%, transparent)'

/**
 * Stack vs queue — the canonical abstract-data-structure comparison.
 *
 * A stack is LIFO: you push and pop at the same end (the top). A queue is FIFO:
 * you enqueue at the rear and dequeue at the front. Stepped so a walkthrough
 * shows the stack, then the queue, then the contrast that defines each.
 */
export function StackQueueDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const op = (id: string) => layerOpacity(spec, stepIndex, id)

  // Stack cells (top-most first), drawn in a bottom-open container.
  const stackCells = ['D', 'C', 'B', 'A']
  // Queue cells left→right (front → rear).
  const queueCells = ['A', 'B', 'C', 'D']

  return (
    <svg
      viewBox="0 0 440 250"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Stack (LIFO) and queue (FIFO) data structures"
    >
      {/* ── STACK ── */}
      <g opacity={op('step-1')}>
        <text x="105" y="26" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          STACK · LIFO
        </text>

        {/* container (open top) */}
        <path d="M62 66 V196 H150 V66" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        {stackCells.map((c, i) => {
          const y = 70 + i * 31
          return (
            <g key={c}>
              <rect x="66" y={y} width="80" height="27" rx="4" fill={ELEM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
              <text x="106" y={y + 18} textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{c}</text>
            </g>
          )
        })}

        {/* top pointer */}
        <text x="176" y="87" fontSize="9" fill={DIAGRAM_TEXT}>← top</text>

        {/* push (down into top) + pop (up out) */}
        <line x1="86" y1="40" x2="86" y2="63" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <path d="M82 57 L86 63 L90 57" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="86" y="36" textAnchor="middle" fontSize="8.5" fill={DIAGRAM_TEXT}>push</text>
        <line x1="126" y1="63" x2="126" y2="40" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <path d="M122 46 L126 40 L130 46" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="126" y="36" textAnchor="middle" fontSize="8.5" fill={DIAGRAM_TEXT}>pop</text>
      </g>

      {/* ── QUEUE ── */}
      <g opacity={op('step-2')}>
        <text x="330" y="26" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          QUEUE · FIFO
        </text>

        {/* container (open ends) */}
        <path d="M256 104 H404" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <path d="M256 142 H404" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        {queueCells.map((c, i) => {
          const x = 258 + i * 36
          return (
            <g key={c}>
              <rect x={x} y="107" width="33" height="32" rx="4" fill={ELEM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
              <text x={x + 16.5} y="127" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{c}</text>
            </g>
          )
        })}

        <text x="274" y="162" textAnchor="middle" fontSize="8.5" fill={DIAGRAM_TEXT}>front</text>
        <text x="386" y="162" textAnchor="middle" fontSize="8.5" fill={DIAGRAM_TEXT}>rear</text>

        {/* dequeue (out the front/left) */}
        <line x1="252" y1="123" x2="228" y2="123" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <path d="M234 119 L228 123 L234 127" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="228" y="112" textAnchor="middle" fontSize="8.5" fill={DIAGRAM_TEXT}>dequeue</text>
        {/* enqueue (in the rear/right) */}
        <line x1="432" y1="123" x2="408" y2="123" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <path d="M414 119 L408 123 L414 127" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="424" y="112" textAnchor="middle" fontSize="8.5" fill={DIAGRAM_TEXT}>enqueue</text>
      </g>

      {/* ── Contrast ── */}
      <g opacity={op('step-3')}>
        <text x="220" y="228" textAnchor="middle" fontSize="9.5" fill={DIAGRAM_TEXT}>
          Stack removes the most recent item; a queue removes the oldest.
        </text>
      </g>
    </svg>
  )
}
