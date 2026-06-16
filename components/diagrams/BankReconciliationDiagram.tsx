'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-4-3-bank-reconciliation-statements'

/** Bank reconciliation — cash book vs bank statement. */
export function BankReconciliationDiagram({
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
      aria-label="Bank reconciliation diagram"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="48" y="40" width="140" height="100" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="118" y="64" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Cash book
        </text>
        <text x="60" y="84" fontSize="8" fill={DIAGRAM_TEXT}>
          Balance per books
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="232" y="40" width="140" height="100" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="302" y="64" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Bank statement
        </text>
        <text x="244" y="84" fontSize="8" fill={DIAGRAM_TEXT}>
          Balance per bank
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="160" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Timing differences — unpresented cheques · uncredited deposits
        </text>
        <text x="210" y="176" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Errors · bank charges · direct debits
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="130" y="188" width="160" height="28" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="206" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
          Reconciled balance
        </text>
      </g>

      <path d="M 188 90 L 232 90" stroke={DIAGRAM_STROKE} strokeWidth="1.5" markerEnd="url(#recon-arrow)" />
      <defs>
        <marker id="recon-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
