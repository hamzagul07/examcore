'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '16-1-purposes-of-an-operating-system-os'

export function OsResourceDiagram({
  className = '',
  stepIndex = 0,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Operating system resource management"
    >
      <rect x="130" y="24" width="160" height="172" rx="10" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
      <text x="210" y="44" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="700">
        Operating System
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'process')}>
        <rect x="148" y="56" width="124" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="78" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Process scheduler
        </text>
        <text x="148" y="108" fontSize="9" fill={DIAGRAM_TEXT}>
          P1 | P2 | P3 — CPU time slices
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'memory')}>
        <rect x="148" y="116" width="124" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="138" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Virtual memory
        </text>
        <text x="148" y="168" fontSize="9" fill={DIAGRAM_TEXT}>
          Pages isolated per process
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'drivers')}>
        <rect x="36" y="88" width="72" height="44" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="72" y="108" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Printer
        </text>
        <text x="72" y="122" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          driver
        </text>
        <line x1="108" y1="110" x2="148" y2="130" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'security')}>
        <rect x="312" y="88" width="72" height="44" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="348" y="108" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          User
        </text>
        <text x="348" y="122" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          ACL / login
        </text>
        <line x1="312" y1="110" x2="272" y2="130" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="196" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          OS abstracts hardware and enforces access control
        </text>
      </g>
    </svg>
  )
}
