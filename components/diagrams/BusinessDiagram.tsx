'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { DiagramArrow, DiagramGrid } from '@/components/diagrams/diagram-chrome'
import { getFamilyIdForSlug } from '@/lib/courses/diagram-families'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const GRID = { x0: 36, y0: 200, x1: 384, y1: 24 }

function quad(x: number, y: number, label: string, active: boolean) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width="88"
        height="52"
        rx="8"
        fill={DIAGRAM_FILL}
        stroke={DIAGRAM_STROKE}
        strokeWidth={active ? 2 : 1.5}
        opacity={active ? 1 : 0.88}
      />
      <text x={x + 44} y={y + 30} textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
        {label}
      </text>
    </g>
  )
}

function marketingView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const cx = 210
  const cy = 110
  return (
    <>
      <DiagramGrid {...GRID} columns={6} rows={4} />
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {quad(48, 48, 'Product', true)}
        <DiagramArrow x1={cx} y1={cy} x2={136} y2={72} opacity={0.55} />
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        {quad(284, 48, 'Price', true)}
        <DiagramArrow x1={cx} y1={cy} x2={284} y2={72} opacity={0.55} />
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        {quad(48, 136, 'Promotion', true)}
        <DiagramArrow x1={cx} y1={cy} x2={136} y2={162} opacity={0.55} />
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        {quad(284, 136, 'Place', true)}
        <DiagramArrow x1={cx} y1={cy} x2={284} y2={162} opacity={0.55} />
      </g>
      <circle cx={cx} cy={cy} r="34" fill="var(--ink, var(--ec-brand))" opacity="0.14" />
      <circle cx={cx} cy={cy} r="34" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" opacity="0.35" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
        Marketing mix
      </text>
    </>
  )
}

function hrmView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <DiagramGrid {...GRID} columns={6} rows={4} />
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="160" y="28" width="100" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="50" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Senior management
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="120" y="78" width="80" height="32" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <rect x="220" y="78" width="80" height="32" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <DiagramArrow x1={210} y1={64} x2={160} y2={78} opacity={0.7} />
        <DiagramArrow x1={210} y1={64} x2={260} y2={78} opacity={0.7} />
        <text x="160" y="98" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Line managers
        </text>
        <text x="260" y="98" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          HR / staff
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        {[100, 160, 220, 280].map((x) => (
          <rect key={x} x={x} y={128} width="40" height="24" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1" />
        ))}
        <DiagramArrow x1={160} y1={110} x2={120} y2={128} opacity={0.45} />
        <DiagramArrow x1={260} y1={110} x2={260} y2={128} opacity={0.45} />
        <text x="210" y="144" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Teams
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="172" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Motivation · training · appraisal · workforce planning
        </text>
      </g>
    </>
  )
}

function operationsView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <DiagramGrid {...GRID} columns={6} rows={4} />
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="36" y="72" width="80" height="48" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="76" y="100" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Inputs
        </text>
        <text x="76" y="132" textAnchor="middle" fontSize="7" fill={DIAGRAM_TEXT}>
          materials · labour · capital
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="170" y="64" width="80" height="64" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="98" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Process
        </text>
        <DiagramArrow x1={116} y1={96} x2={170} y2={96} />
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <rect x="304" y="72" width="80" height="48" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="344" y="100" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Outputs
        </text>
        <DiagramArrow x1={250} y1={96} x2={304} y2={96} />
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <path
          d="M 76 148 Q 210 168 344 148"
          fill="none"
          stroke={DIAGRAM_STROKE}
          strokeWidth="1"
          strokeDasharray="4 3"
          opacity="0.55"
        />
        <text x="210" y="164" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Value added = output value − bought-in inputs
        </text>
      </g>
    </>
  )
}

function financeView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <DiagramGrid {...GRID} columns={6} rows={4} />
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
        <DiagramArrow x1={120} y1={62} x2={170} y2={100} opacity={0.5} />
        <DiagramArrow x1={300} y1={62} x2={250} y2={100} opacity={0.5} />
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="140" y="96" width="140" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="120" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Cash flow forecast
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <rect x="100" y="148" width="220" height="28" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1" />
        <text x="210" y="166" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Budget vs actual — variance analysis
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="196" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Investment appraisal: payback · ARR · NPV · IRR
        </text>
      </g>
    </>
  )
}

function elasticityView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const ax = { x0: 72, y0: 188, x1: 360, y1: 40 }
  return (
    <>
      <DiagramGrid {...ax} xLabel="Quantity" yLabel="Price" columns={6} rows={5} />
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="210" y="28" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Price elasticity of demand
        </text>
        <text x="210" y="48" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          PED = (% ΔQd) / (% ΔP)
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1={ax.x0} y1={100} x2={ax.x1} y2={100} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x={ax.x1 + 6} y={104} fontSize="9" fill={DIAGRAM_TEXT}>
          D (unit elastic)
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <line x1={ax.x0 + 40} y1={ax.y0} x2={ax.x0 + 40} y2={ax.y1 + 20} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x={ax.x0 + 48} y={ax.y1 + 28} fontSize="8" fill={DIAGRAM_TEXT}>
          Inelastic |PED| &lt; 1
        </text>
        <line x1={ax.x0} y1={ax.y0 - 20} x2={ax.x1} y2={ax.y1 + 40} stroke={DIAGRAM_STROKE} strokeWidth="2" opacity="0.65" />
        <text x={ax.x1 - 20} y={ax.y1 + 52} fontSize="8" fill={DIAGRAM_TEXT}>
          Elastic |PED| &gt; 1
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="210" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Price rise + inelastic demand → revenue rises · elastic → revenue falls
        </text>
      </g>
    </>
  )
}

function strategyView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const labels = ['Political', 'Economic', 'Social', 'Tech', 'Legal', 'Env']
  const cx = 210
  const cy = 102
  return (
    <>
      <DiagramGrid {...GRID} columns={6} rows={4} />
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {labels.map((l, i) => {
          const angle = (i / labels.length) * Math.PI * 2 - Math.PI / 2
          const px = cx + Math.cos(angle) * 72
          const py = cy + Math.sin(angle) * 56
          return (
            <g key={l}>
              <line x1={cx} y1={cy} x2={px} y2={py} stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.35" />
              <circle cx={px} cy={py} r="22" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
              <text x={px} y={py + 4} textAnchor="middle" fontSize="7" fill={DIAGRAM_TEXT}>
                {l.slice(0, 4)}
              </text>
            </g>
          )
        })}
        <circle cx={cx} cy={cy} r="26" fill="var(--ink, var(--ec-brand))" opacity="0.12" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
          PESTLE
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="130" y="158" width="160" height="28" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1" />
        <text x="210" y="176" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Stakeholders — power vs interest matrix
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="196" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Objectives cascade from mission to functional targets
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="214" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
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
    family === 'commerce-elasticity'
      ? 'elasticity'
      : family === 'commerce-hrm'
        ? 'hrm'
        : family === 'commerce-operations'
          ? 'operations'
          : family === 'commerce-finance'
            ? 'finance'
            : family === 'commerce-strategy'
              ? 'strategy'
              : 'marketing'

  const view =
    variant === 'elasticity'
      ? elasticityView
      : variant === 'hrm'
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
      className={`lesson-diagram-svg lesson-diagram-svg--business ${className}`.trim()}
      role="img"
      aria-label="Business studies concept diagram"
    >
      {view(spec, stepIndex)}
    </svg>
  )
}
