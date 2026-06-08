import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function WavesComparison({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 260"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Comparison of transverse and longitudinal waves"
    >
      <defs>
        <marker id="wave-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      <text x="12" y="22" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT} fontWeight="700">
        Transverse
      </text>
      <path
        d="M30 70 Q70 35 110 70 T190 70 T270 70 T350 70"
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth="2.5"
      />
      <line x1="110" y1="70" x2="190" y2="70" stroke={DIAGRAM_TEXT} strokeWidth="1.5" markerEnd="url(#wave-arrow)" markerStart="url(#wave-arrow)" />
      <text x="150" y="58" textAnchor="middle" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT}>
        λ
      </text>
      <line x1="270" y1="70" x2="270" y2="35" stroke={DIAGRAM_TEXT} strokeWidth="1.5" markerEnd="url(#wave-arrow)" />
      <text x="282" y="52" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT}>
        A
      </text>
      <line x1="360" y1="45" x2="360" y2="95" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#wave-arrow)" markerStart="url(#wave-arrow)" />
      <text x="372" y="72" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT}>
        ↕
      </text>
      <line x1="30" y1="100" x2="380" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="1.5" markerEnd="url(#wave-arrow)" />
      <text x="205" y="118" textAnchor="middle" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT}>
        energy →
      </text>

      <line x1="20" y1="138" x2="400" y2="138" stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.3" />

      <text x="12" y="162" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT} fontWeight="700">
        Longitudinal
      </text>
      {[40, 70, 95, 120, 145, 170, 195, 220, 245, 270, 295, 320, 345, 370].map((x, i) => (
        <line
          key={x}
          x1={x}
          y1={185}
          x2={x}
          y2={i % 3 === 0 ? 210 : i % 3 === 1 ? 225 : 200}
          stroke={DIAGRAM_STROKE}
          strokeWidth="2"
          opacity={i % 3 === 1 ? 1 : 0.55}
        />
      ))}
      <text x="100" y="238" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT}>
        compression
      </text>
      <text x="250" y="238" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT}>
        rarefaction
      </text>
      <line x1="30" y1="248" x2="380" y2="248" stroke={DIAGRAM_STROKE} strokeWidth="1.5" markerEnd="url(#wave-arrow)" />
      <text x="205" y="256" textAnchor="middle" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT}>
        particle motion →
      </text>
    </svg>
  )
}
