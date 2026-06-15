'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '11-2-constructs'

function diamond(x: number, y: number, label: string) {
  return (
    <g>
      <polygon
        points={`${x},${y + 16} ${x + 40},${y} ${x + 80},${y + 16} ${x + 40},${y + 32}`}
        fill={DIAGRAM_FILL}
        stroke={DIAGRAM_STROKE}
        strokeWidth="1.5"
      />
      <text x={x + 40} y={y + 19} textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
        {label}
      </text>
    </g>
  )
}

export function ControlFlowDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Selection and iteration control structures"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'if-else')}>
        {diamond(36, 24, 'IF cond')}
        <rect x="56" y="72" width="64" height="24" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="88" y="88" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          THEN
        </text>
        <rect x="136" y="72" width="64" height="24" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="168" y="88" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          ELSE
        </text>
        <line x1="76" y1="56" x2="88" y2="72" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <line x1="116" y1="56" x2="168" y2="72" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'case')}>
        <rect x="240" y="28" width="140" height="52" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="310" y="48" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          CASE OF x
        </text>
        <text x="310" y="64" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          1: …  2: …  OTHERWISE: …
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'for-loop')}>
        <rect x="36" y="120" width="160" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="116" y="142" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          FOR i ← 1 TO n STEP 1
        </text>
        <path d="M 116 156 L 116 176 L 196 176 L 196 138" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'while-loop')}>
        <rect x="240" y="120" width="140" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="310" y="142" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          WHILE cond DO … ENDWHILE
        </text>
        <text x="310" y="178" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Update loop var — avoid infinite loops
        </text>
      </g>
    </svg>
  )
}
