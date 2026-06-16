'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '6-1-data-security'

function arrow(x1: number, y1: number, x2: number, y2: number, dashed = false) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={DIAGRAM_STROKE}
      strokeWidth="1.5"
      strokeDasharray={dashed ? '5 3' : undefined}
      markerEnd="url(#data-sec-arrow)"
    />
  )
}

export function DataSecurityDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)

  return (
    <svg
      viewBox="0 0 420 240"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Data security threats and controls including pharming DNS redirect"
    >
      <defs>
        <marker
          id="data-sec-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>

      <g opacity={layerOpacity(spec, stepIndex, 'threats')}>
        {[
          { x: 24, label: 'Malware' },
          { x: 154, label: 'Phishing' },
          { x: 284, label: 'DoS' },
        ].map(({ x, label }) => (
          <g key={label}>
            <rect
              x={x}
              y={20}
              width={96}
              height={32}
              rx="6"
              fill={DIAGRAM_FILL}
              stroke={DIAGRAM_STROKE}
              strokeWidth="1.5"
            />
            <text x={x + 48} y={40} textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
              {label}
            </text>
          </g>
        ))}
        <text x="210" y="68" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Common threats to data confidentiality and availability
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'pharming')}>
        <rect
          x="24"
          y="82"
          width="88"
          height="36"
          rx="6"
          fill={DIAGRAM_FILL}
          stroke={DIAGRAM_STROKE}
          strokeWidth="1.5"
        />
        <text x="68" y="98" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT} fontWeight="600">
          Browser
        </text>
        <text x="68" y="110" textAnchor="middle" fontSize="7" fill={DIAGRAM_TEXT}>
          types bank.com
        </text>

        <rect
          x="166"
          y="82"
          width="88"
          height="36"
          rx="6"
          fill={DIAGRAM_FILL}
          stroke={DIAGRAM_STROKE}
          strokeWidth="1.5"
        />
        <text x="210" y="98" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT} fontWeight="600">
          DNS server
        </text>
        <text x="210" y="110" textAnchor="middle" fontSize="7" fill={DIAGRAM_TEXT}>
          compromised
        </text>

        <rect
          x="308"
          y="82"
          width="88"
          height="36"
          rx="6"
          fill={DIAGRAM_FILL}
          stroke="#c53030"
          strokeWidth="1.5"
        />
        <text x="352" y="98" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT} fontWeight="600">
          Fake site
        </text>
        <text x="352" y="110" textAnchor="middle" fontSize="7" fill={DIAGRAM_TEXT}>
          fake-bank.com
        </text>

        {arrow(112, 100, 166, 100)}
        {arrow(254, 100, 308, 100, true)}

        <text x="210" y="136" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Pharming — correct URL, wrong destination (DNS redirect)
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'auth')}>
        <rect
          x="120"
          y="152"
          width="180"
          height="40"
          rx="8"
          fill={DIAGRAM_FILL}
          stroke={DIAGRAM_STROKE}
          strokeWidth="2"
        />
        <text x="210" y="176" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Password + 2FA + biometrics
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'backup')}>
        <text x="48" y="212" fontSize="10" fill={DIAGRAM_TEXT}>
          Full · Incremental · Off-site backup
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'physical')}>
        <text x="48" y="232" fontSize="10" fill={DIAGRAM_TEXT}>
          Physical: locks, CCTV, secure disposal
        </text>
      </g>
    </svg>
  )
}
