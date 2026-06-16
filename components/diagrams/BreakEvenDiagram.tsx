'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '2-2-4-cost-volume-profit-analysis'

/** CVP / break-even chart — TR, TC, FC lines with break-even point and margin of safety. */
export function BreakEvenDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const axis = { x0: 48, y0: 180, x1: 380, y1: 36 }
  const beX = 220
  const beY = 118

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Break-even and cost-volume-profit chart"
    >
      <line x1={axis.x0} y1={axis.y0} x2={axis.x1} y2={axis.y0} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1={axis.x0} y1={axis.y0} x2={axis.x0} y2={axis.y1} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x={axis.x1 - 8} y={axis.y0 + 14} fontSize="9" fill={DIAGRAM_TEXT}>
        Output
      </text>
      <text x={12} y={axis.y1 + 4} fontSize="9" fill={DIAGRAM_TEXT}>
        £
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line x1={axis.x0} y1={148} x2={axis.x1} y2={148} stroke={DIAGRAM_STROKE} strokeWidth="2" strokeDasharray="6 4" />
        <text x={axis.x0 + 8} y={142} fontSize="9" fill={DIAGRAM_TEXT}>
          Fixed costs
        </text>
        <text x={260} y={52} fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Contribution = SP − VC
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line x1={axis.x0} y1={148} x2={axis.x1} y2={72} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x={axis.x1 - 72} y={68} fontSize="9" fill={DIAGRAM_TEXT}>
          Total cost
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <line x1={axis.x0} y1={axis.y0} x2={axis.x1} y2={48} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x={axis.x1 - 64} y={44} fontSize="9" fill={DIAGRAM_TEXT}>
          Total revenue
        </text>
        <circle cx={beX} cy={beY} r="5" fill="var(--ink, var(--ec-brand))" />
        <text x={beX + 10} y={beY - 6} fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
          Break-even
        </text>
        <text x={beX - 20} y={beY + 22} fontSize="8" fill={DIAGRAM_TEXT}>
          TR = TC
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x={beX} y={beY - 2} width={100} height={axis.y0 - beY + 2} fill={DIAGRAM_FILL} opacity="0.55" />
        <line x1={beX + 100} y1={axis.y0} x2={beX + 100} y2={beY} stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="4 3" />
        <text x={beX + 108} y={beY + 24} fontSize="9" fill={DIAGRAM_TEXT}>
          Margin of safety
        </text>
        <text x={48} y={24} fontSize="9" fill={DIAGRAM_TEXT}>
          BEP (units) = FC ÷ contribution per unit
        </text>
      </g>
    </svg>
  )
}
