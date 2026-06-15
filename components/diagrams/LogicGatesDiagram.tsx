'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '3-2-logic-gates-and-logic-circuits'

function gateBody(x: number, y: number, label: string, shape: 'not' | 'and' | 'or') {
  if (shape === 'not') {
    return (
      <g>
        <polygon
          points={`${x},${y} ${x + 28},${y + 14} ${x},${y + 28}`}
          fill={DIAGRAM_FILL}
          stroke={DIAGRAM_STROKE}
          strokeWidth="2"
        />
        <circle cx={x + 32} cy={y + 14} r="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x={x + 10} y={y + 17} fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
          {label}
        </text>
      </g>
    )
  }
  const path =
    shape === 'and'
      ? `M ${x} ${y + 14} L ${x + 18} ${y} Q ${x + 36} ${y} ${x + 36} ${y + 14} Q ${x + 36} ${y + 28} ${x + 18} ${y + 28} Z`
      : `M ${x} ${y + 14} L ${x + 16} ${y} Q ${x + 38} ${y + 14} ${x + 16} ${y + 28} Z`
  return (
    <g>
      <path d={path} fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x={x + 12} y={y + 17} fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
        {label}
      </text>
    </g>
  )
}

export function LogicGatesDiagram({
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
      aria-label="Logic gates and Boolean circuits"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'basic-gates')}>
        {gateBody(48, 36, 'NOT', 'not')}
        {gateBody(48, 88, 'AND', 'and')}
        {gateBody(48, 140, 'OR', 'or')}
        <text x="18" y="52" fontSize="10" fill={DIAGRAM_TEXT}>
          A
        </text>
        <line x1="28" y1="50" x2="48" y2="50" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="18" y="108" fontSize="10" fill={DIAGRAM_TEXT}>
          A,B
        </text>
        <line x1="28" y1="100" x2="48" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <line x1="28" y1="116" x2="48" y2="116" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="120" y="52" fontSize="10" fill={DIAGRAM_TEXT}>
          Q = NOT A
        </text>
        <text x="120" y="104" fontSize="10" fill={DIAGRAM_TEXT}>
          Q = A AND B
        </text>
        <text x="120" y="156" fontSize="10" fill={DIAGRAM_TEXT}>
          Q = A OR B
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'universal')}>
        {gateBody(230, 48, 'NAND', 'and')}
        {gateBody(230, 110, 'NOR', 'or')}
        <text x="300" y="64" fontSize="10" fill={DIAGRAM_TEXT}>
          NOT(A AND B)
        </text>
        <text x="300" y="126" fontSize="10" fill={DIAGRAM_TEXT}>
          NOT(A OR B)
        </text>
        <text x="230" y="168" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Universal — build any logic
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'algebra')}>
        <rect x="48" y="178" width="324" height="32" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="198" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          De Morgan: (A·B)&apos; = A&apos; + B&apos; · (A+B)&apos; = A&apos;·B&apos;
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'circuit')}>
        <line x1="60" y1="24" x2="100" y2="24" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <line x1="60" y1="24" x2="60" y2="170" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        {gateBody(100, 156, 'XOR', 'or')}
        <line x1="136" y1="170" x2="180" y2="170" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <circle cx="188" cy="170" r="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="188" y="174" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          S
        </text>
        <text x="210" y="24" fontSize="10" fill={DIAGRAM_TEXT}>
          Half-adder: sum bit from XOR, carry from AND
        </text>
      </g>
    </svg>
  )
}
