'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getFamilyIdForSlug } from '@/lib/courses/diagram-families'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '10-3-1-the-concept-of-investment-appraisal'

function paybackView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const years = [0, 1, 2, 3, 4, 5]
  const cfs = [-120, 40, 45, 50, 30, 20]

  return (
    <>
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
            <rect key={i} x={44 + i * 56} y={y} width={24} height={h} rx="3" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          )
        })}
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <line x1="168" y1="48" x2="168" y2="160" stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="5 4" />
        <text x="176" y="56" fontSize="9" fill={DIAGRAM_TEXT}>
          Payback
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="196" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          ARR uses profit; payback uses cash — both ignore discounting
        </text>
      </g>
    </>
  )
}

function npvView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const nominal = [40, 45, 50, 30]
  const discounted = [36, 37, 38, 20]
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="210" y="28" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Time value of money
        </text>
        <text x="210" y="48" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          DF = 1 / (1 + r)^n
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        {nominal.map((h, i) => (
          <rect key={i} x={80 + i * 64} y={160 - h} width={28} height={h} rx="3" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        ))}
        <text x="48" y="100" fontSize="8" fill={DIAGRAM_TEXT}>
          Nominal CF
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        {discounted.map((h, i) => (
          <rect key={i} x={96 + i * 64} y={160 - h} width={28} height={h} rx="3" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" opacity="0.75" />
        ))}
        <text x="48" y="140" fontSize="8" fill={DIAGRAM_TEXT}>
          PV
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="188" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          NPV = Σ PV − initial cost · Accept if NPV &gt; 0
        </text>
        <text x="210" y="204" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          IRR — discount rate where NPV = 0
        </text>
      </g>
    </>
  )
}

/** Payback timeline and investment appraisal methods. */
export function InvestmentAppraisalDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const family = getFamilyIdForSlug(lessonSlug) ?? 'commerce-investment'
  const view = family === 'commerce-investment-npv' ? npvView : paybackView

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Investment appraisal diagram"
    >
      {view(spec, stepIndex)}
    </svg>
  )
}
