'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '4-2-bonding-and-structure'

/** Structure types for 9701 topic 4.2. */
export function BondStructureDiagram({
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
      aria-label="Bonding and structure: ionic, covalent, metallic, and simple molecular"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Structure determines physical properties
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {[
          [100, 90],
          [130, 90],
          [100, 120],
          [130, 120],
        ].map(([x, y], i) => (
          <rect key={i} x={x - 12} y={y - 12} width="24" height="24" fill={i % 2 ? DIAGRAM_FILL : 'color-mix(in srgb, var(--ec-brand) 12%, transparent)'} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        ))}
        <text x="115" y="148" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          giant ionic
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1="220" y1="120" x2="250" y2="80" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
        <line x1="250" y1="80" x2="290" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
        <line x1="290" y1="100" x2="270" y2="130" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
        <line x1="270" y1="130" x2="220" y2="120" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
        <text x="255" y="148" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          giant covalent
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        {[
          [100, 88],
          [130, 88],
          [160, 88],
        ].map(([x], i) => (
          <circle key={i} cx={x} cy={108} r="10" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        ))}
        <path d="M 90 125 Q 125 95 170 125" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="130" y="148" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          giant metallic
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <circle cx="290" cy="100" r="14" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <circle cx="340" cy="100" r="14" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <line x1="304" y1="100" x2="326" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="1" strokeDasharray="3 3" />
        <text x="315" y="148" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          simple molecular
        </text>
        <text x="210" y="188" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          High mp: giant structures · Low mp: weak IMF between molecules
        </text>
      </g>
    </svg>
  )
}
