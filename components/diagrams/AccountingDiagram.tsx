'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getFamilyIdForSlug } from '@/lib/courses/diagram-families'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

function tAccount(x: number, y: number, label: string) {
  return (
    <g>
      <line x1={x} y1={y} x2={x + 100} y2={y} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1={x + 50} y1={y} x2={x + 50} y2={y + 80} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x={x + 50} y={y - 6} textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
        {label}
      </text>
      <text x={x + 24} y={y + 18} textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
        Dr
      </text>
      <text x={x + 76} y={y + 18} textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
        Cr
      </text>
    </g>
  )
}

function ledgerView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="36" y="36" width="100" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="86" y="60" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Source document
        </text>
        <path d="M 136 56 L 168 56" stroke={DIAGRAM_STROKE} strokeWidth="1.5" markerEnd="url(#acc-arrow)" />
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="168" y="36" width="100" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="218" y="60" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Book of prime entry
        </text>
        <path d="M 268 56 L 300 56" stroke={DIAGRAM_STROKE} strokeWidth="1.5" markerEnd="url(#acc-arrow)" />
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        {tAccount(300, 24, 'Ledger')}
        <text x="350" y="120" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          DEAD CLIC — debit / credit rules
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="120" y="140" width="200" height="48" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="220" y="162" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Trial balance
        </text>
        <text x="220" y="178" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Total Dr = Total Cr
        </text>
      </g>
    </>
  )
}

function costView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const points = '36,170 80,120 140,100 200,90 280,88 360,86'
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="210" y="28" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Cost classification
        </text>
        <rect x="48" y="44" width="88" height="32" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="92" y="64" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Fixed
        </text>
        <rect x="166" y="44" width="88" height="32" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="64" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Variable
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <polyline points={points} fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="48" y="188" fontSize="9" fill={DIAGRAM_TEXT}>
          Output
        </text>
        <text x="8" y="110" fontSize="9" fill={DIAGRAM_TEXT} transform="rotate(-90 8 110)">
          Cost
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <line x1="200" y1="40" x2="200" y2="170" stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="5 4" />
        <text x="208" y="52" fontSize="9" fill={DIAGRAM_TEXT}>
          Break-even Q
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="260" y="130" fontSize="10" fill={DIAGRAM_TEXT}>
          Contribution = SP − VC
        </text>
        <text x="260" y="148" fontSize="9" fill={DIAGRAM_TEXT}>
          Margin of safety above break-even
        </text>
      </g>
    </>
  )
}

function statementsView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="48" y="40" width="140" height="120" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="118" y="62" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Statement of P/L
        </text>
        <text x="60" y="84" fontSize="9" fill={DIAGRAM_TEXT}>
          Revenue
        </text>
        <text x="60" y="102" fontSize="9" fill={DIAGRAM_TEXT}>
          − Expenses
        </text>
        <text x="60" y="128" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
          = Profit
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="232" y="40" width="140" height="120" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="302" y="62" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          SoFP
        </text>
        <text x="244" y="84" fontSize="9" fill={DIAGRAM_TEXT}>
          Assets
        </text>
        <text x="244" y="102" fontSize="9" fill={DIAGRAM_TEXT}>
          Liabilities + Equity
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        {[48, 72, 96].map((h, i) => (
          <rect key={i} x={80 + i * 56} y={180 - h} width={40} height={h} fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        ))}
        <text x="210" y="196" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Ratio trends — liquidity, profitability
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="24" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Adjustments → revised statements → user analysis
        </text>
      </g>
    </>
  )
}

export function AccountingDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = '1-2-1-the-accounting-system',
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  const family = getFamilyIdForSlug(lessonSlug) ?? 'commerce-accounting-ledger'
  const variant =
    family === 'commerce-accounting-cost'
      ? 'cost'
      : family === 'commerce-accounting-statements'
        ? 'statements'
        : 'ledger'

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Accounting concept diagram"
    >
      <defs>
        <marker id="acc-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      {variant === 'cost' ? costView(spec, stepIndex) : variant === 'statements' ? statementsView(spec, stepIndex) : ledgerView(spec, stepIndex)}
    </svg>
  )
}
