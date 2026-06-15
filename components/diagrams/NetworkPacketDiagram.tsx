'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '2-1-networks-including-the-internet'

function node(x: number, y: number, label: string) {
  return (
    <g>
      <circle cx={x} cy={y} r="18" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x={x} y={y + 4} textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
        {label}
      </text>
    </g>
  )
}

export function NetworkPacketDiagram({
  className = '',
  stepIndex = 0,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Networks, packet switching, and TCP/IP layers"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'lan-wan')}>
        <rect x="36" y="28" width="120" height="56" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="96" y="50" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          LAN
        </text>
        <text x="96" y="68" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          school / office
        </text>
        <rect x="264" y="28" width="120" height="56" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="324" y="50" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          WAN
        </text>
        <text x="324" y="68" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          internet scale
        </text>
        <line x1="156" y1="56" x2="264" y2="56" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'packet-switch')}>
        {node(72, 120, 'A')}
        {node(210, 100, 'R1')}
        {node(210, 150, 'R2')}
        {node(348, 120, 'B')}
        <line x1="90" y1="120" x2="192" y2="108" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <line x1="90" y1="120" x2="192" y2="142" stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="5 3" />
        <line x1="228" y1="100" x2="330" y2="120" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <line x1="228" y1="150" x2="330" y2="120" stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="5 3" />
        <text x="210" y="178" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Packets may take different routes
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'circuit-switch')}>
        <line x1="60" y1="196" x2="360" y2="196" stroke={DIAGRAM_STROKE} strokeWidth="3" />
        <text x="210" y="212" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Circuit switching — dedicated path for whole call
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'tcp-layers')}>
        {['Application', 'Transport', 'Internet', 'Link'].map((layer, i) => (
          <g key={layer}>
            <rect x="300" y={36 + i * 22} width="100" height="18" rx="3" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <text x="350" y={49 + i * 22} textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
              {layer}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
