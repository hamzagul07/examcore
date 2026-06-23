'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'

const AOKS = [
  'Mathematics',
  'Natural sciences',
  'Human sciences',
  'History',
  'The arts',
  'Ethics',
  'Religious knowledge systems',
  'Indigenous knowledge systems',
]

const WOKS = [
  'Language',
  'Sense perception',
  'Emotion',
  'Reason',
  'Imagination',
  'Faith',
  'Intuition',
  'Memory',
]

export function TokFrameworkDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const showWok = stepIndex >= 1
  const showLink = stepIndex >= 2

  return (
    <svg
      viewBox="0 0 440 280"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="TOK framework: areas of knowledge and ways of knowing"
    >
      <circle cx="220" cy="140" r="118" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" opacity={0.35} />
      <circle cx="220" cy="140" r="72" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="220" y="136" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="700">
        Knower
      </text>
      <text x="220" y="152" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
        Knowledge questions
      </text>

      {AOKS.map((label, i) => {
        const angle = (i / AOKS.length) * Math.PI * 2 - Math.PI / 2
        const x = 220 + Math.cos(angle) * 102
        const y = 140 + Math.sin(angle) * 102
        return (
          <g key={label} opacity={stepIndex === 0 || stepIndex >= 2 ? 1 : 0.45}>
            <circle cx={x} cy={y} r="4" fill={DIAGRAM_STROKE} />
            <text x={x} y={y + (y < 140 ? -10 : 16)} textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
              {label}
            </text>
          </g>
        )
      })}

      {showWok
        ? WOKS.map((label, i) => {
            const angle = (i / WOKS.length) * Math.PI * 2
            const x = 220 + Math.cos(angle) * 58
            const y = 140 + Math.sin(angle) * 58
            return (
              <g key={label}>
                <circle cx={x} cy={y} r="3" fill={DIAGRAM_TEXT} opacity={0.7} />
                <text x={x} y={y + 12} textAnchor="middle" fontSize="7" fill={DIAGRAM_TEXT}>
                  {label}
                </text>
              </g>
            )
          })
        : null}

      {showLink ? (
        <text x="220" y="262" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          WOKs shape how we construct knowledge within each AOK
        </text>
      ) : null}
    </svg>
  )
}
