import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function FreeBodyDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Free body diagram showing force F on mass m producing acceleration a"
    >
      <defs>
        <marker id="fbd-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      <rect
        x="155"
        y="70"
        width="90"
        height="60"
        rx="6"
        fill={DIAGRAM_FILL}
        stroke={DIAGRAM_STROKE}
        strokeWidth="2"
      />
      <text x="200" y="105" textAnchor="middle" fontSize="14" fill={DIAGRAM_TEXT} fontWeight="600">
        m
      </text>
      <line
        x1="90"
        y1="100"
        x2="150"
        y2="100"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        markerEnd="url(#fbd-arrow)"
      />
      <text x="118" y="88" textAnchor="middle" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT}>
        F
      </text>
      <line
        x1="200"
        y1="140"
        x2="290"
        y2="140"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
        markerEnd="url(#fbd-arrow)"
      />
      <text x="245" y="128" textAnchor="middle" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT}>
        a
      </text>
      <text x="200" y="178" textAnchor="middle" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT} fontWeight="600">
        F_net = ma
      </text>
    </svg>
  )
}
