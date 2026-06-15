'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '19-1-algorithms'

export function AlgorithmTraceDiagram({
  className = '',
  stepIndex = 0,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Algorithm searching, sorting, and trace tables"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'linear-search')}>
        <text x="48" y="28" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Linear search O(n)
        </text>
        {[12, 45, 78, 111, 144, 177].map((x, i) => (
          <g key={x}>
            <rect
              x={x}
              y={36}
              width={28}
              height={28}
              rx="4"
              fill={i === 4 ? 'color-mix(in srgb, var(--ec-brand) 18%, var(--course-surface))' : DIAGRAM_FILL}
              stroke={DIAGRAM_STROKE}
              strokeWidth={i === 4 ? 2.5 : 1.5}
            />
            <text x={x + 14} y={54} textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
              {[3, 7, 9, 12, 15, 21][i]}
            </text>
          </g>
        ))}
        <text x="48" y="82" fontSize="10" fill={DIAGRAM_TEXT}>
          Check each item left → right until found
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'binary-search')}>
        <text x="48" y="102" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Binary search O(log n) — sorted list
        </text>
        <line x1="48" y1="118" x2="372" y2="118" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <line x1="210" y1="118" x2="210" y2="148" stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="130" y="136" fontSize="9" fill={DIAGRAM_TEXT}>
          low..mid
        </text>
        <text x="250" y="136" fontSize="9" fill={DIAGRAM_TEXT}>
          mid+1..high
        </text>
        <text x="210" y="164" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Compare mid — discard half each step
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'bubble-sort')}>
        <text x="48" y="182" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Bubble sort — swap adjacent if out of order
        </text>
        {[48, 88, 128, 168].map((x, i) => (
          <rect key={x} x={x} y={188} width={32} height={24} rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        ))}
        <text x="64" y="204" fontSize="10" fill={DIAGRAM_TEXT}>
          5
        </text>
        <text x="104" y="204" fontSize="10" fill={DIAGRAM_TEXT}>
          2
        </text>
        <text x="144" y="204" fontSize="10" fill={DIAGRAM_TEXT}>
          8
        </text>
        <text x="184" y="204" fontSize="10" fill={DIAGRAM_TEXT}>
          1
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'trace-table')}>
        <rect x="240" y="36" width="160" height="88" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="320" y="56" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Trace table
        </text>
        <text x="252" y="74" fontSize="9" fill={DIAGRAM_TEXT}>
          Pass | i | temp | swapped
        </text>
        <text x="252" y="90" fontSize="9" fill={DIAGRAM_TEXT}>
          1 | 1 | 2 | T
        </text>
        <text x="252" y="106" fontSize="9" fill={DIAGRAM_TEXT}>
          1 | 2 | — | F
        </text>
      </g>
    </svg>
  )
}
