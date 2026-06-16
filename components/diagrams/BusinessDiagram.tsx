'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getFamilyIdForSlug } from '@/lib/courses/diagram-families'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

function quad(x: number, y: number, label: string) {
  return (
    <g>
      <rect x={x} y={y} width="88" height="52" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x={x + 44} y={y + 30} textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
        {label}
      </text>
    </g>
  )
}

function marketingView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>{quad(48, 48, 'Product')}</g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>{quad(284, 48, 'Price')}</g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>{quad(48, 136, 'Promotion')}</g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>{quad(284, 136, 'Place')}</g>
      <circle cx="210" cy="110" r="34" fill="var(--ink, var(--ec-brand))" opacity="0.12" />
      <text x="210" y="114" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
        Mix
      </text>
    </>
  )
}

function hrmView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="160" y="24" width="100" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="46" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Senior management
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="120" y="72" width="80" height="32" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <rect x="220" y="72" width="80" height="32" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <line x1="210" y1="60" x2="160" y2="72" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <line x1="210" y1="60" x2="260" y2="72" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="130" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Motivation · training · appraisal
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="168" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Workforce planning links demand to skills and headcount
        </text>
      </g>
    </>
  )
}

function operationsView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="36" y="72" width="80" height="48" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="76" y="100" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Inputs
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="170" y="64" width="80" height="64" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="98" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Process
        </text>
        <path d="M 116 96 L 170 96" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <rect x="304" y="72" width="80" height="48" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="344" y="100" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Outputs
        </text>
        <path d="M 250 96 L 304 96" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="160" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Quality · capacity · inventory · lean improvements
        </text>
      </g>
    </>
  )
}

function financeView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="210" y="36" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Sources of finance
        </text>
        <rect x="48" y="48" width="72" height="28" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="84" y="66" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Internal
        </text>
        <rect x="300" y="48" width="72" height="28" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="336" y="66" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          External
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="140" y="96" width="140" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="120" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Cash flow forecast
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="160" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Budget vs actual — variance analysis
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="188" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Investment appraisal: payback, ARR, NPV
        </text>
      </g>
    </>
  )
}

function strategyView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const labels = ['Political', 'Economic', 'Social', 'Tech', 'Legal', 'Env']
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {labels.map((l, i) => {
          const angle = (i / labels.length) * Math.PI * 2 - Math.PI / 2
          const cx = 210 + Math.cos(angle) * 72
          const cy = 100 + Math.sin(angle) * 56
          return (
            <g key={l}>
              <circle cx={cx} cy={cy} r="22" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
              <text x={cx} y={cy + 4} textAnchor="middle" fontSize="7" fill={DIAGRAM_TEXT}>
                {l.slice(0, 4)}
              </text>
            </g>
          )
        })}
        <text x="210" y="100" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
          PESTLE
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="168" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Stakeholders — power vs interest
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="188" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Objectives cascade from mission to functional targets
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="208" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Evaluate strategic choice against constraints
        </text>
      </g>
    </>
  )
}

export function BusinessDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = '3-3-1-the-elements-of-the-marketing-mix-the-4ps',
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  const family = getFamilyIdForSlug(lessonSlug) ?? 'commerce-marketing'
  const variant =
    family === 'commerce-hrm'
      ? 'hrm'
      : family === 'commerce-operations'
        ? 'operations'
        : family === 'commerce-finance'
          ? 'finance'
          : family === 'commerce-strategy'
            ? 'strategy'
            : 'marketing'

  const view =
    variant === 'hrm'
      ? hrmView
      : variant === 'operations'
        ? operationsView
        : variant === 'finance'
          ? financeView
          : variant === 'strategy'
            ? strategyView
            : marketingView

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Business studies concept diagram"
    >
      {view(spec, stepIndex)}
    </svg>
  )
}
