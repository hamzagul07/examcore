import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

function Cart({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width="56"
        height="36"
        rx="5"
        fill={DIAGRAM_FILL}
        stroke={DIAGRAM_STROKE}
        strokeWidth="2"
      />
      <circle cx={x + 14} cy={y + 40} r="8" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <circle cx={x + 42} cy={y + 40} r="8" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text
        x={x + 28}
        y={y + 22}
        textAnchor="middle"
        style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }}
        fill={DIAGRAM_TEXT}
        fontWeight="600"
      >
        {label}
      </text>
    </g>
  )
}

export function CollisionBeforeAfter({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 240"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Inelastic collision before and after: m1 v1 collides with stationary m2"
    >
      <defs>
        <marker id="col-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      <text x="105" y="24" textAnchor="middle" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT} fontWeight="700">
        BEFORE
      </text>
      <Cart x={40} y={36} label="m₁" />
      <Cart x={170} y={36} label="m₂" />
      <line x1="100" y1="54" x2="165" y2="54" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#col-arrow)" />
      <text x="132" y="42" textAnchor="middle" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT}>
        v₁
      </text>
      <text x="198" y="54" textAnchor="start" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT}>
        0
      </text>

      <line x1="20" y1="100" x2="400" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.35" />

      <text x="210" y="122" textAnchor="middle" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT} fontWeight="700">
        AFTER
      </text>
      <Cart x={152} y={134} label="m₁+m₂" />
      <line x1="212" y1="152" x2="300" y2="152" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#col-arrow)" />
      <text x="256" y="140" textAnchor="middle" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT}>
        v′
      </text>
      <text x="210" y="220" textAnchor="middle" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT} fontWeight="600">
        m₁v₁ = (m₁+m₂)v′
      </text>
    </svg>
  )
}
