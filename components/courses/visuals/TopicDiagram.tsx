import type { VisualTemplate } from '@/lib/courses/visual-types'

type Props = { template: VisualTemplate; className?: string }

const stroke = 'currentColor'
const fillMuted = 'color-mix(in srgb, var(--ec-brand) 18%, transparent)'

export function TopicDiagram({ template, className = '' }: Props) {
  const common = `course-topic-diagram ${className}`.trim()

  switch (template) {
    case 'circuit':
      return (
        <svg viewBox="0 0 400 220" className={common} aria-hidden>
          <rect x="20" y="30" width="360" height="160" rx="12" fill={fillMuted} stroke={stroke} strokeWidth="1.5" opacity="0.35" />
          <circle cx="80" cy="110" r="28" fill="none" stroke={stroke} strokeWidth="2" />
          <text x="80" y="115" textAnchor="middle" fontSize="14" fill={stroke}>+</text>
          <rect x="160" y="95" width="80" height="30" rx="4" fill={fillMuted} stroke={stroke} strokeWidth="2" />
          <text x="200" y="115" textAnchor="middle" fontSize="11" fill={stroke}>R</text>
          <path d="M108 110 H160 M240 110 H292" stroke={stroke} strokeWidth="2" markerEnd="url(#arrow)" />
          <path d="M80 138 V170 H320 V138" stroke={stroke} strokeWidth="2" fill="none" />
          <text x="200" y="195" textAnchor="middle" fontSize="11" fill={stroke} opacity="0.7">conventional current →</text>
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill={stroke} />
            </marker>
          </defs>
        </svg>
      )
    case 'waves':
      return (
        <svg viewBox="0 0 400 220" className={common} aria-hidden>
          <path
            d="M20 110 Q60 60 100 110 T180 110 T260 110 T340 110"
            fill="none"
            stroke={stroke}
            strokeWidth="2.5"
          />
          <path
            d="M20 130 Q60 80 100 130 T180 130 T260 130 T340 130"
            fill="none"
            stroke="var(--ec-brand)"
            strokeWidth="2"
            opacity="0.6"
          />
          <line x1="100" y1="40" x2="100" y2="180" stroke={stroke} strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
          <text x="100" y="35" textAnchor="middle" fontSize="10" fill={stroke} opacity="0.7">λ</text>
          <line x1="60" y1="170" x2="140" y2="170" stroke={stroke} strokeWidth="1.5" />
          <text x="100" y="200" textAnchor="middle" fontSize="11" fill={stroke} opacity="0.7">wavelength & amplitude</text>
        </svg>
      )
    case 'forces':
      return (
        <svg viewBox="0 0 400 220" className={common} aria-hidden>
          <rect x="120" y="90" width="80" height="50" rx="6" fill={fillMuted} stroke={stroke} strokeWidth="2" />
          <text x="160" y="120" textAnchor="middle" fontSize="12" fill={stroke}>m</text>
          <line x1="160" y1="90" x2="160" y2="40" stroke="var(--ec-brand)" strokeWidth="3" markerEnd="url(#farrow)" />
          <text x="175" y="55" fontSize="11" fill="var(--ec-brand)">F</text>
          <line x1="200" y1="115" x2="280" y2="115" stroke={stroke} strokeWidth="2" markerEnd="url(#farrow2)" />
          <text x="290" y="119" fontSize="11" fill={stroke}>a →</text>
          <defs>
            <marker id="farrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--ec-brand)" />
            </marker>
            <marker id="farrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill={stroke} />
            </marker>
          </defs>
        </svg>
      )
    case 'energy':
      return (
        <svg viewBox="0 0 400 220" className={common} aria-hidden>
          <rect x="40" y="80" width="90" height="60" rx="8" fill={fillMuted} stroke={stroke} strokeWidth="2" />
          <text x="85" y="115" textAnchor="middle" fontSize="11" fill={stroke}>stored</text>
          <path d="M140 110 H180" stroke={stroke} strokeWidth="2" markerEnd="url(#earrow)" />
          <rect x="190" y="80" width="90" height="60" rx="8" fill="color-mix(in srgb, var(--ec-brand) 25%, transparent)" stroke="var(--ec-brand)" strokeWidth="2" />
          <text x="235" y="115" textAnchor="middle" fontSize="11" fill={stroke}>transfer</text>
          <path d="M290 110 H330" stroke={stroke} strokeWidth="2" markerEnd="url(#earrow)" />
          <rect x="340" y="80" width="40" height="60" rx="8" fill={fillMuted} stroke={stroke} strokeWidth="2" />
          <text x="200" y="185" textAnchor="middle" fontSize="11" fill={stroke} opacity="0.7">energy flow</text>
          <defs>
            <marker id="earrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill={stroke} />
            </marker>
          </defs>
        </svg>
      )
    case 'cell':
      return (
        <svg viewBox="0 0 400 220" className={common} aria-hidden>
          <ellipse cx="200" cy="110" rx="150" ry="75" fill={fillMuted} stroke={stroke} strokeWidth="2" />
          <ellipse cx="200" cy="110" rx="120" ry="55" fill="none" stroke="var(--ec-brand)" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.7" />
          <circle cx="155" cy="100" r="18" fill="color-mix(in srgb, var(--ec-brand) 30%, transparent)" stroke={stroke} strokeWidth="1.5" />
          <text x="155" y="104" textAnchor="middle" fontSize="9" fill={stroke}>N</text>
          <circle cx="245" cy="125" r="14" fill="none" stroke={stroke} strokeWidth="1.5" />
          <text x="200" y="200" textAnchor="middle" fontSize="11" fill={stroke} opacity="0.7">cell structure</text>
        </svg>
      )
    case 'molecule':
      return (
        <svg viewBox="0 0 400 220" className={common} aria-hidden>
          <circle cx="120" cy="110" r="22" fill={fillMuted} stroke={stroke} strokeWidth="2" />
          <circle cx="200" cy="80" r="18" fill="color-mix(in srgb, var(--ec-brand) 25%, transparent)" stroke="var(--ec-brand)" strokeWidth="2" />
          <circle cx="280" cy="110" r="22" fill={fillMuted} stroke={stroke} strokeWidth="2" />
          <line x1="142" y1="100" x2="182" y2="88" stroke={stroke} strokeWidth="2" />
          <line x1="218" y1="92" x2="258" y2="105" stroke={stroke} strokeWidth="2" />
          <text x="200" y="175" textAnchor="middle" fontSize="11" fill={stroke} opacity="0.7">bonds & structure</text>
        </svg>
      )
    case 'genetics':
      return (
        <svg viewBox="0 0 400 220" className={common} aria-hidden>
          <path d="M160 40 C120 80 120 140 160 180 C200 140 200 80 160 40" fill="none" stroke={stroke} strokeWidth="2" />
          <path d="M240 40 C200 80 200 140 240 180 C280 140 280 80 240 40" fill="none" stroke="var(--ec-brand)" strokeWidth="2" />
          <line x1="175" y1="70" x2="225" y2="85" stroke={stroke} strokeWidth="1.5" opacity="0.6" />
          <line x1="170" y1="110" x2="230" y2="110" stroke={stroke} strokeWidth="1.5" opacity="0.6" />
          <line x1="175" y1="150" x2="225" y2="135" stroke={stroke} strokeWidth="1.5" opacity="0.6" />
          <text x="200" y="200" textAnchor="middle" fontSize="11" fill={stroke} opacity="0.7">DNA / inheritance</text>
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 400 220" className={common} aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect
                x={50 + i * 85}
                y={70}
                width="70"
                height="50"
                rx="10"
                fill={i % 2 ? fillMuted : 'color-mix(in srgb, var(--ec-brand) 15%, transparent)'}
                stroke={stroke}
                strokeWidth="1.5"
              />
              {i < 3 ? (
                <path
                  d={`M${120 + i * 85} 95 H${135 + i * 85}`}
                  stroke={stroke}
                  strokeWidth="2"
                  markerEnd="url(#parrow)"
                />
              ) : null}
            </g>
          ))}
          <text x="200" y="165" textAnchor="middle" fontSize="11" fill={stroke} opacity="0.7">step-by-step process</text>
          <defs>
            <marker id="parrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill={stroke} />
            </marker>
          </defs>
        </svg>
      )
  }
}
