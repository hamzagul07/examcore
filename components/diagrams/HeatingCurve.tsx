import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function HeatingCurve({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 240"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Heating curve showing temperature plateaus during phase changes"
    >
      <line x1="50" y1="200" x2="390" y2="200" stroke={DIAGRAM_TEXT} strokeWidth="1.5" />
      <line x1="50" y1="200" x2="50" y2="30" stroke={DIAGRAM_TEXT} strokeWidth="1.5" />
      <text x="220" y="228" textAnchor="middle" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT}>
        Energy added
      </text>
      <text
        x="18"
        y="115"
        textAnchor="middle"
        transform="rotate(-90 18 115)"
        style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }}
        fill={DIAGRAM_TEXT}
      >
        Temperature
      </text>
      <polyline
        points="60,180 120,120 120,120 180,120 180,80 240,80 240,50 300,50 300,50 360,35"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
      />
      <rect x="115" y="115" width="70" height="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.6" />
      <rect x="235" y="45" width="70" height="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.6" />
      <text x="150" y="108" textAnchor="middle" style={{ fontSize: 'clamp(10px, 1.2cqi, 12px)' }} fill={DIAGRAM_TEXT}>
        melting
      </text>
      <text x="270" y="38" textAnchor="middle" style={{ fontSize: 'clamp(10px, 1.2cqi, 12px)' }} fill={DIAGRAM_TEXT}>
        boiling
      </text>
      <text x="90" y="155" style={{ fontSize: 'clamp(10px, 1.2cqi, 12px)' }} fill={DIAGRAM_TEXT}>
        Q = mcΔT
      </text>
      <text x="200" y="68" style={{ fontSize: 'clamp(10px, 1.2cqi, 12px)' }} fill={DIAGRAM_TEXT}>
        Q = mcΔT
      </text>
      <text x="150" y="145" textAnchor="middle" style={{ fontSize: 'clamp(9px, 1.1cqi, 11px)' }} fill={DIAGRAM_TEXT}>
        phase change
      </text>
      <text x="270" y="58" textAnchor="middle" style={{ fontSize: 'clamp(9px, 1.1cqi, 11px)' }} fill={DIAGRAM_TEXT}>
        phase change
      </text>
    </svg>
  )
}
