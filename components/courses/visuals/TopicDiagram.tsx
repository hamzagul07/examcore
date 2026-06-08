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
        <svg viewBox="0 0 400 240" className={common} aria-hidden>
          <path
            d="M30 120 Q70 70 110 120 T190 120 T270 120 T350 120"
            fill="none"
            stroke="var(--ec-brand)"
            strokeWidth="3"
          />
          <line x1="110" y1="120" x2="190" y2="120" stroke={stroke} strokeWidth="1.5" markerEnd="url(#warrow)" markerStart="url(#warrow-start)" />
          <text x="150" y="108" textAnchor="middle" fontSize="11" fill={stroke} fontWeight="600">λ</text>
          <line x1="70" y1="120" x2="70" y2="75" stroke={stroke} strokeWidth="1.5" markerEnd="url(#warrow)" />
          <text x="58" y="68" fontSize="10" fill={stroke}>A</text>
          <path d="M20 185 H380" stroke={stroke} strokeWidth="1.5" markerEnd="url(#warrow)" opacity="0.55" />
          <text x="385" y="189" fontSize="10" fill={stroke} opacity="0.75">energy →</text>
          <text x="200" y="215" textAnchor="middle" fontSize="11" fill={stroke} opacity="0.7">
            transverse wave — λ, amplitude, energy flow
          </text>
          <defs>
            <marker id="warrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill={stroke} />
            </marker>
            <marker id="warrow-start" markerWidth="8" markerHeight="8" refX="2" refY="3" orient="auto">
              <path d="M6,0 L0,3 L6,6" fill={stroke} />
            </marker>
          </defs>
        </svg>
      )
    case 'forces':
      return (
        <svg viewBox="0 0 400 240" className={common} aria-hidden>
          <rect x="130" y="105" width="100" height="58" rx="8" fill={fillMuted} stroke={stroke} strokeWidth="2" />
          <text x="180" y="138" textAnchor="middle" fontSize="14" fontWeight="600" fill={stroke}>m</text>
          <line x1="180" y1="105" x2="180" y2="48" stroke="var(--ec-brand)" strokeWidth="3.5" markerEnd="url(#farrow)" />
          <text x="196" y="62" fontSize="13" fontWeight="600" fill="var(--ec-brand)">F</text>
          <line x1="240" y1="134" x2="330" y2="134" stroke={stroke} strokeWidth="2.5" markerEnd="url(#farrow2)" />
          <text x="342" y="138" fontSize="12" fontWeight="600" fill={stroke}>a →</text>
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
    case 'thermal':
      return (
        <svg viewBox="0 0 400 240" className={common} aria-hidden>
          <g>
            <rect x="72" y="48" width="36" height="132" rx="10" fill="none" stroke={stroke} strokeWidth="2" />
            <rect x="78" y="118" width="24" height="56" rx="4" fill="color-mix(in srgb, var(--ec-brand) 22%, transparent)" />
            <circle cx="90" cy="188" r="16" fill="color-mix(in srgb, var(--ec-brand) 30%, transparent)" stroke={stroke} strokeWidth="2" />
            <text x="90" y="28" textAnchor="middle" className="course-diagram-label" fontWeight="600" fill={stroke}>
              °C
            </text>
            <text x="90" y="72" textAnchor="middle" className="course-diagram-label-sm" fill={stroke}>
              100
            </text>
            <text x="90" y="168" textAnchor="middle" className="course-diagram-label-sm" fill={stroke}>
              0
            </text>
          </g>
          <g>
            <rect x="252" y="48" width="36" height="132" rx="10" fill="none" stroke="var(--ec-brand)" strokeWidth="2" />
            <rect x="258" y="118" width="24" height="56" rx="4" fill="color-mix(in srgb, var(--ec-brand) 28%, transparent)" />
            <circle cx="270" cy="188" r="16" fill="color-mix(in srgb, var(--ec-brand) 35%, transparent)" stroke="var(--ec-brand)" strokeWidth="2" />
            <text x="270" y="28" textAnchor="middle" className="course-diagram-label" fontWeight="600" fill="var(--ec-brand)">
              K
            </text>
            <text x="270" y="72" textAnchor="middle" className="course-diagram-label-sm" fill={stroke}>
              373
            </text>
            <text x="270" y="168" textAnchor="middle" className="course-diagram-label-sm" fill={stroke}>
              273
            </text>
          </g>
          <path d="M128 120 H232" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" markerEnd="url(#tarrow)" />
          <text x="200" y="112" textAnchor="middle" className="course-diagram-label-sm" fill={stroke} opacity="0.85">
            K = C + 273.15
          </text>
          <text x="200" y="222" textAnchor="middle" className="course-diagram-caption" fill={stroke} opacity="0.75">
            0°C = 273 K · 100°C = 373 K
          </text>
          <defs>
            <marker id="tarrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill={stroke} />
            </marker>
          </defs>
        </svg>
      )
    case 'energy':
      return (
        <svg viewBox="0 0 400 220" className={common} aria-hidden>
          <rect x="55" y="95" width="70" height="85" rx="6" fill="none" stroke={stroke} strokeWidth="2" />
          <rect x="60" y="130" width="60" height="45" rx="2" fill={fillMuted} stroke={stroke} strokeWidth="1.5" />
          <text x="90" y="122" textAnchor="middle" fontSize="10" fill={stroke}>substance</text>
          <text x="90" y="155" textAnchor="middle" fontSize="9" fill={stroke} opacity="0.75">mass m</text>
          <path d="M90 55 V88" stroke="var(--ec-brand)" strokeWidth="2.5" markerEnd="url(#heat-in)" />
          <text x="102" y="68" fontSize="10" fill="var(--ec-brand)">Q in</text>
          <line x1="155" y1="170" x2="155" y2="50" stroke={stroke} strokeWidth="1" strokeDasharray="3 3" opacity="0.35" />
          <text x="155" y="42" textAnchor="middle" fontSize="9" fill={stroke} opacity="0.7">T</text>
          <path
            d="M175 165 L195 155 L215 140 L235 125 L255 95 L275 95 L295 95"
            fill="none"
            stroke="var(--ec-brand)"
            strokeWidth="2"
          />
          <circle cx="255" cy="95" r="4" fill="var(--ec-brand)" />
          <circle cx="275" cy="95" r="4" fill="var(--ec-brand)" />
          <text x="265" y="82" textAnchor="middle" fontSize="8" fill={stroke} opacity="0.65">phase change</text>
          <text x="310" y="100" fontSize="9" fill={stroke}>ΔT</text>
          <text x="200" y="200" textAnchor="middle" fontSize="10" fill={stroke} opacity="0.7">
            heating curve — Q = mcΔT and Q = mL
          </text>
          <defs>
            <marker id="heat-in" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--ec-brand)" />
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
