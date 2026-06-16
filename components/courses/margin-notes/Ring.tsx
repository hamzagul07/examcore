'use client'

type RingProps = {
  pct: number
  size?: number
  stroke?: number
  color?: string
  label?: string | number
}

export function Ring({
  pct,
  size = 44,
  stroke = 4,
  color = 'var(--ink)',
  label,
}: RingProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c * (1 - pct / 100)
  return (
    <span className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <span className="ring-label">{label != null ? label : `${pct}%`}</span>
    </span>
  )
}
