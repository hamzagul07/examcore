import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

function Thermometer({ x, scale, marks }: { x: number; scale: string; marks: { y: number; label: string }[] }) {
  return (
    <g>
      <rect x={x} y="40" width="36" height="150" rx="18" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <rect x={x + 10} y="55" width="16" height="120" rx="8" fill="color-mix(in srgb, var(--course-subject-accent, var(--ec-brand)) 25%, transparent)" />
      <circle cx={x + 18} cy="178" r="14" fill="color-mix(in srgb, var(--course-subject-accent, var(--ec-brand)) 35%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x={x + 18} y="28" textAnchor="middle" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT} fontWeight="700">
        {scale}
      </text>
      {marks.map((m) => (
        <g key={m.label}>
          <line x1={x + 36} y1={m.y} x2={x + 48} y2={m.y} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x={x + 52} y={m.y + 4} style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT}>
            {m.label}
          </text>
        </g>
      ))}
    </g>
  )
}

export function TwoThermometers({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Celsius and Kelvin thermometers showing K equals C plus 273.15"
    >
      <Thermometer
        x={80}
        scale="°C"
        marks={[
          { y: 155, label: '0°C' },
          { y: 75, label: '100°C' },
        ]}
      />
      <Thermometer
        x={240}
        scale="K"
        marks={[
          { y: 155, label: '273.15 K' },
          { y: 75, label: '373.15 K' },
        ]}
      />
      <line x1="128" y1="155" x2="258" y2="155" stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="200" y="200" textAnchor="middle" style={{ fontSize: 'clamp(11px, 1.4cqi, 14px)' }} fill={DIAGRAM_TEXT} fontWeight="600">
        K = C + 273.15
      </text>
    </svg>
  )
}
