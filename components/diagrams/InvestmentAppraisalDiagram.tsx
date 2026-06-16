'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '10-3-1-the-concept-of-investment-appraisal'

/** Payback timeline and investment appraisal methods. */
export function InvestmentAppraisalDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const years = [0, 1, 2, 3, 4, 5]
  const cfs = [-120, 40, 45, 50, 30, 20]

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Investment appraisal diagram"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="210" y="28" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Initial outlay vs future returns
        </text>
        {years.map((y, i) => (
          <g key={y}>
            <line x1={56 + i * 56} y1="160" x2={56 + i * 56} y2="48" stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.25" />
            <text x={56 + i * 56} y="174" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
              Y{y}
            </text>
          </g>
        ))}
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        {cfs.map((v, i) => {
          const h = Math.abs(v) * 0.9
          const y = v < 0 ? 160 : 160 - h
          return (
            <rect
              key={i}
              x={44 + i * 56}
              y={y}
              width={24}
              height={h}
              rx="3"
              fill={DIAGRAM_FILL}
              stroke={DIAGRAM_STROKE}
              strokeWidth="1.5"
            />
          )
        })}
        <text x="48" y="44" fontSize="9" fill={DIAGRAM_TEXT}>
          Net cash flows
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <line x1="168" y1="48" x2="168" y2="160" stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="5 4" />
        <text x="176" y="56" fontSize="9" fill={DIAGRAM_TEXT}>
          Payback
        </text>
        <text x="210" y="196" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Payback period — cumulative CF turns positive
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="280" y="100" fontSize="9" fill={DIAGRAM_TEXT}>
          ARR = avg annual profit ÷ investment
        </text>
        <text x="280" y="118" fontSize="9" fill={DIAGRAM_TEXT}>
          NPV — discount future CFs
        </text>
        <text x="280" y="136" fontSize="9" fill={DIAGRAM_TEXT}>
          IRR — rate where NPV = 0
        </text>
      </g>
    </svg>
  )
}
