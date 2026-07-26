import type { VisualTemplate } from '@/lib/courses/visual-types'

type Props = { template: VisualTemplate; className?: string }

/**
 * The fallback figures, for lessons with no purpose-built live diagram.
 *
 * These used to be drawn entirely in currentColor plus one brand green, which
 * meant nothing in the picture distinguished a source from a resistor from the
 * current flowing between them — the colour carried no information, and across
 * a whole course every figure looked like the one before it.
 *
 * Colour is a role here, not decoration:
 *   warm    energy, heat, sources
 *   hot     force, current — the thing that acts
 *   cool    fields, flow, water
 *   violet  abstract quantities, axes, measurements
 *   green   matter, mass, living things
 *
 * A student who sees the same colour mean the same thing across figures gets
 * something from it. One who sees decoration gets nothing.
 */

const stroke = 'currentColor'
const WARM = 'var(--dg-warm)'
const COOL = 'var(--dg-cool)'
const HOT = 'var(--dg-hot)'
const VIOLET = 'var(--dg-violet)'
const GREEN = 'var(--dg-green)'

/** A translucent fill of a role colour, for bodies and regions. */
const tint = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`

/** Arrowheads have to match their line, so each role gets its own marker. */
function Arrow({ id, color }: { id: string; color: string }) {
  return (
    <marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6" fill={color} />
    </marker>
  )
}

export function TopicDiagram({ template, className = '' }: Props) {
  const common = `course-topic-diagram ${className}`.trim()

  switch (template) {
    case 'circuit':
      return (
        <svg viewBox="0 0 400 220" className={common} aria-hidden>
          <rect x="20" y="30" width="360" height="160" rx="12" fill={tint(COOL, 7)} stroke={COOL} strokeWidth="1.5" opacity="0.5" />
          {/* Source: warm, because it is where the energy comes from. */}
          <circle cx="80" cy="110" r="28" fill={tint(WARM, 18)} stroke={WARM} strokeWidth="2.5" />
          <text x="80" y="117" textAnchor="middle" fontSize="16" fontWeight="700" fill={WARM}>+</text>
          <text x="80" y="68" textAnchor="middle" fontSize="10" fontWeight="600" fill={WARM}>cell</text>
          {/* Resistor: violet — a component, not a flow. */}
          <rect x="160" y="95" width="80" height="30" rx="4" fill={tint(VIOLET, 16)} stroke={VIOLET} strokeWidth="2.5" />
          <text x="200" y="116" textAnchor="middle" fontSize="13" fontWeight="700" fill={VIOLET}>R</text>
          {/* Current: hot, because it is the thing that acts. */}
          <path d="M108 110 H158 M242 110 H292" stroke={HOT} strokeWidth="2.5" markerEnd="url(#c-hot)" />
          <path d="M80 138 V170 H320 V138" stroke={HOT} strokeWidth="2.5" fill="none" opacity="0.85" />
          <text x="200" y="192" textAnchor="middle" fontSize="11" fontWeight="600" fill={HOT}>conventional current →</text>
          <defs>
            <Arrow id="c-hot" color={HOT} />
          </defs>
        </svg>
      )

    case 'waves':
      return (
        <svg viewBox="0 0 400 240" className={common} aria-hidden>
          <path
            d="M30 120 Q70 70 110 120 T190 120 T270 120 T350 120"
            fill="none"
            stroke={COOL}
            strokeWidth="3.5"
          />
          {/* Wavelength and amplitude are different measurements. */}
          <line x1="110" y1="120" x2="190" y2="120" stroke={VIOLET} strokeWidth="2" markerEnd="url(#w-v)" markerStart="url(#w-v-start)" />
          <text x="150" y="107" textAnchor="middle" fontSize="13" fontWeight="700" fill={VIOLET}>λ</text>
          <line x1="70" y1="120" x2="70" y2="75" stroke={WARM} strokeWidth="2" markerEnd="url(#w-w)" />
          <text x="52" y="72" fontSize="12" fontWeight="700" fill={WARM}>A</text>
          <path d="M20 185 H366" stroke={HOT} strokeWidth="2" markerEnd="url(#w-h)" opacity="0.85" />
          <text x="196" y="206" textAnchor="middle" fontSize="11" fontWeight="600" fill={HOT}>energy travels this way →</text>
          <text x="200" y="228" textAnchor="middle" fontSize="10" fill={stroke} opacity="0.6">
            transverse wave
          </text>
          <defs>
            <Arrow id="w-v" color={VIOLET} />
            <Arrow id="w-w" color={WARM} />
            <Arrow id="w-h" color={HOT} />
            <marker id="w-v-start" markerWidth="8" markerHeight="8" refX="2" refY="3" orient="auto">
              <path d="M6,0 L0,3 L6,6" fill={VIOLET} />
            </marker>
          </defs>
        </svg>
      )

    case 'forces':
      return (
        <svg viewBox="0 0 400 240" className={common} aria-hidden>
          {/* The mass is matter; the arrows acting on it are not. */}
          <rect x="130" y="105" width="100" height="58" rx="8" fill={tint(GREEN, 18)} stroke={GREEN} strokeWidth="2.5" />
          <text x="180" y="141" textAnchor="middle" fontSize="16" fontWeight="700" fill={GREEN}>m</text>
          <line x1="180" y1="105" x2="180" y2="48" stroke={HOT} strokeWidth="4" markerEnd="url(#f-h)" />
          <text x="196" y="62" fontSize="14" fontWeight="700" fill={HOT}>F</text>
          <line x1="240" y1="134" x2="326" y2="134" stroke={WARM} strokeWidth="3" markerEnd="url(#f-w)" />
          <text x="340" y="139" fontSize="13" fontWeight="700" fill={WARM}>a</text>
          <text x="200" y="205" textAnchor="middle" fontSize="10" fill={stroke} opacity="0.6">
            net force on a mass produces acceleration
          </text>
          <defs>
            <Arrow id="f-h" color={HOT} />
            <Arrow id="f-w" color={WARM} />
          </defs>
        </svg>
      )

    case 'thermal':
      return (
        <svg viewBox="0 0 400 240" className={common} aria-hidden>
          {/* Two scales, two colours — that they differ is the whole point. */}
          <g>
            <rect x="72" y="48" width="36" height="132" rx="10" fill="none" stroke={COOL} strokeWidth="2.5" />
            <rect x="78" y="118" width="24" height="56" rx="4" fill={tint(COOL, 30)} />
            <circle cx="90" cy="188" r="16" fill={tint(COOL, 38)} stroke={COOL} strokeWidth="2.5" />
            <text x="90" y="32" textAnchor="middle" fontSize="14" fontWeight="700" fill={COOL}>°C</text>
            <text x="90" y="76" textAnchor="middle" fontSize="10" fill={stroke} opacity="0.75">100</text>
            <text x="90" y="172" textAnchor="middle" fontSize="10" fill={stroke} opacity="0.75">0</text>
          </g>
          <g>
            <rect x="252" y="48" width="36" height="132" rx="10" fill="none" stroke={WARM} strokeWidth="2.5" />
            <rect x="258" y="118" width="24" height="56" rx="4" fill={tint(WARM, 30)} />
            <circle cx="270" cy="188" r="16" fill={tint(WARM, 38)} stroke={WARM} strokeWidth="2.5" />
            <text x="270" y="32" textAnchor="middle" fontSize="14" fontWeight="700" fill={WARM}>K</text>
            <text x="270" y="76" textAnchor="middle" fontSize="10" fill={stroke} opacity="0.75">373</text>
            <text x="270" y="172" textAnchor="middle" fontSize="10" fill={stroke} opacity="0.75">273</text>
          </g>
          <path d="M128 120 H230" stroke={VIOLET} strokeWidth="2" strokeDasharray="5 4" markerEnd="url(#t-v)" />
          <text x="180" y="112" textAnchor="middle" fontSize="11" fontWeight="600" fill={VIOLET}>+273.15</text>
          <text x="200" y="222" textAnchor="middle" fontSize="10" fill={stroke} opacity="0.6">
            same size steps — only the zero moves
          </text>
          <defs>
            <Arrow id="t-v" color={VIOLET} />
          </defs>
        </svg>
      )

    case 'energy':
      return (
        <svg viewBox="0 0 400 220" className={common} aria-hidden>
          <rect x="55" y="95" width="70" height="85" rx="6" fill="none" stroke={GREEN} strokeWidth="2.5" />
          <rect x="60" y="130" width="60" height="45" rx="2" fill={tint(GREEN, 22)} stroke={GREEN} strokeWidth="1.5" />
          <text x="90" y="122" textAnchor="middle" fontSize="10" fontWeight="600" fill={GREEN}>substance</text>
          <text x="90" y="158" textAnchor="middle" fontSize="9" fill={stroke} opacity="0.7">mass m</text>
          {/* Heat in is warm; the temperature axis is an abstract quantity. */}
          <path d="M90 55 V88" stroke={WARM} strokeWidth="3" markerEnd="url(#e-w)" />
          <text x="102" y="70" fontSize="11" fontWeight="700" fill={WARM}>Q in</text>
          <line x1="155" y1="172" x2="155" y2="52" stroke={VIOLET} strokeWidth="1.5" opacity="0.6" markerEnd="url(#e-v)" />
          <text x="155" y="44" textAnchor="middle" fontSize="10" fontWeight="600" fill={VIOLET}>T</text>
          <path
            d="M175 165 L195 155 L215 140 L235 125 L255 95 L275 95 L295 95"
            fill="none"
            stroke={HOT}
            strokeWidth="2.5"
          />
          {/* The flat run is the phase change — the part students miss. */}
          <path d="M255 95 H275" stroke={COOL} strokeWidth="5" strokeLinecap="round" />
          <circle cx="255" cy="95" r="4" fill={COOL} />
          <circle cx="275" cy="95" r="4" fill={COOL} />
          <text x="265" y="82" textAnchor="middle" fontSize="9" fontWeight="600" fill={COOL}>phase change</text>
          <text x="306" y="100" fontSize="10" fontWeight="600" fill={HOT}>ΔT</text>
          <text x="200" y="205" textAnchor="middle" fontSize="10" fill={stroke} opacity="0.6">
            heating curve — Q = mcΔT along the slopes, Q = mL across the flat
          </text>
          <defs>
            <Arrow id="e-w" color={WARM} />
            <Arrow id="e-v" color={VIOLET} />
          </defs>
        </svg>
      )

    case 'cell':
      return (
        <svg viewBox="0 0 400 220" className={common} aria-hidden>
          <ellipse cx="200" cy="105" rx="150" ry="72" fill={tint(GREEN, 12)} stroke={GREEN} strokeWidth="2.5" />
          <ellipse cx="200" cy="105" rx="120" ry="53" fill="none" stroke={COOL} strokeWidth="2" strokeDasharray="6 4" opacity="0.85" />
          <circle cx="155" cy="98" r="18" fill={tint(VIOLET, 26)} stroke={VIOLET} strokeWidth="2" />
          <text x="155" y="103" textAnchor="middle" fontSize="10" fontWeight="700" fill={VIOLET}>N</text>
          <circle cx="245" cy="120" r="14" fill={tint(WARM, 26)} stroke={WARM} strokeWidth="2" />
          <text x="245" y="124" textAnchor="middle" fontSize="9" fontWeight="700" fill={WARM}>M</text>
          <text x="200" y="200" textAnchor="middle" fontSize="10" fill={stroke} opacity="0.65">
            membrane · cytoplasm · nucleus (N) · mitochondria (M)
          </text>
        </svg>
      )

    case 'molecule':
      return (
        <svg viewBox="0 0 400 220" className={common} aria-hidden>
          {/* Different elements, different colours — the reason to draw it at all. */}
          <circle cx="120" cy="110" r="22" fill={tint(COOL, 26)} stroke={COOL} strokeWidth="2.5" />
          <circle cx="200" cy="78" r="20" fill={tint(HOT, 26)} stroke={HOT} strokeWidth="2.5" />
          <circle cx="280" cy="110" r="22" fill={tint(COOL, 26)} stroke={COOL} strokeWidth="2.5" />
          <line x1="141" y1="101" x2="181" y2="88" stroke={VIOLET} strokeWidth="3" />
          <line x1="219" y1="89" x2="259" y2="102" stroke={VIOLET} strokeWidth="3" />
          <text x="200" y="152" textAnchor="middle" fontSize="10" fontWeight="600" fill={VIOLET}>shared pairs</text>
          <text x="200" y="182" textAnchor="middle" fontSize="10" fill={stroke} opacity="0.65">
            bonding and shape
          </text>
        </svg>
      )

    case 'genetics':
      return (
        <svg viewBox="0 0 400 220" className={common} aria-hidden>
          {/* Two strands, two colours — complementary, not identical. */}
          <path d="M160 40 C120 80 120 140 160 180 C200 140 200 80 160 40" fill="none" stroke={COOL} strokeWidth="3" />
          <path d="M240 40 C200 80 200 140 240 180 C280 140 280 80 240 40" fill="none" stroke={HOT} strokeWidth="3" />
          <line x1="175" y1="70" x2="225" y2="85" stroke={VIOLET} strokeWidth="2.5" opacity="0.9" />
          <line x1="170" y1="110" x2="230" y2="110" stroke={VIOLET} strokeWidth="2.5" opacity="0.9" />
          <line x1="175" y1="150" x2="225" y2="135" stroke={VIOLET} strokeWidth="2.5" opacity="0.9" />
          <text x="200" y="202" textAnchor="middle" fontSize="10" fill={stroke} opacity="0.65">
            complementary strands, joined by base pairs
          </text>
        </svg>
      )

    default: {
      // A process: the steps run warm through to cool, so progress is visible
      // at a glance rather than as four identical boxes.
      const shades = [WARM, HOT, VIOLET, COOL]
      return (
        <svg viewBox="0 0 400 220" className={common} aria-hidden>
          {[0, 1, 2, 3].map((i) => {
            const c = shades[i]!
            return (
              <g key={i}>
                <rect
                  x={50 + i * 85}
                  y={70}
                  width="70"
                  height="50"
                  rx="10"
                  fill={tint(c, 18)}
                  stroke={c}
                  strokeWidth="2.5"
                />
                <text
                  x={85 + i * 85}
                  y={101}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="700"
                  fill={c}
                >
                  {i + 1}
                </text>
                {i < 3 ? (
                  <path
                    d={`M${122 + i * 85} 95 H${135 + i * 85}`}
                    stroke={shades[i + 1]!}
                    strokeWidth="2.5"
                    markerEnd={`url(#p-${i})`}
                  />
                ) : null}
              </g>
            )
          })}
          <text x="200" y="165" textAnchor="middle" fontSize="10" fill={stroke} opacity="0.65">
            step-by-step process
          </text>
          <defs>
            {[0, 1, 2].map((i) => (
              <Arrow key={i} id={`p-${i}`} color={shades[i + 1]!} />
            ))}
          </defs>
        </svg>
      )
    }
  }
}
