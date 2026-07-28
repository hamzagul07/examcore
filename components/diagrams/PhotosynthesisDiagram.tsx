'use client'

import type { CSSProperties } from 'react'
import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'

/**
 * Photosynthesis for 9700 topic 13 and IB C1.3.
 *
 * Four scenes, one per walkthrough beat, each using the whole canvas rather
 * than a quarter of it — the beats sit at different scales (organelle →
 * pigment → membrane → stroma), so cutting between full figures teaches better
 * than dimming layers of one crowded drawing. A locator in the corner keeps the
 * student oriented while the scale changes.
 *
 * Scene order matches the diagram spec captions for
 * `13-1-photosynthesis-as-an-energy-transfer-process`:
 *   0 overview → 1 pigments → 2 light-dependent → 3 Calvin cycle
 * Slugs with no spec (13-2, c1-3) fall through to scene 0, which stands alone.
 */

const T = DIAGRAM_TEXT
const S = DIAGRAM_STROKE
const SURFACE = DIAGRAM_FILL

/**
 * Semantic accents. Mid-tone so they stay legible on both the zen paper and
 * late-night surfaces — the theme contrast layer flattens diagram ink to one
 * colour unless an element opts out with `dgm-hue`, so anything using these
 * must carry that class.
 */
const LIGHT = '#e0a13a' // photons, light energy
const WATER = '#3f9fb5' // water, oxygen
const CARRIER = '#8b6ec9' // ATP / NADPH
const CARBON = '#4f9e5f' // CO2, sugars
const MEMBRANE = 'color-mix(in srgb, var(--ec-brand) 22%, transparent)'
const STROMA = 'color-mix(in srgb, var(--ec-brand) 8%, transparent)'

/** Marks an element as semantically coloured so the theme layer leaves it alone. */
function hue(...classes: (string | false | undefined)[]) {
  return ['dgm-hue', ...classes.filter(Boolean)].join(' ')
}

const drawLen = { '--dgm-draw-length': 560 } as CSSProperties

type SceneProps = { active: boolean }

/** Leader line from a label to the feature it names. */
function Leader({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <path d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke={S} strokeWidth="1" opacity="0.5" fill="none" />
}

function ArrowDefs() {
  return (
    <defs>
      <marker id="ps-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill={S} />
      </marker>
      <marker id="ps-arrow-light" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill={LIGHT} />
      </marker>
      <marker id="ps-arrow-carbon" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill={CARBON} />
      </marker>
      <marker id="ps-arrow-carrier" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill={CARRIER} />
      </marker>
      <marker id="ps-arrow-water" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill={WATER} />
      </marker>
      <linearGradient id="ps-visible" x1="0" x2="1">
        <stop offset="0%" stopColor="#7b4bd0" />
        <stop offset="17%" stopColor="#3f5fd0" />
        <stop offset="34%" stopColor="#33a1a1" />
        <stop offset="50%" stopColor="#4caf50" />
        <stop offset="67%" stopColor="#e0c93a" />
        <stop offset="84%" stopColor="#e08b3a" />
        <stop offset="100%" stopColor="#c94a3a" />
      </linearGradient>
    </defs>
  )
}

/** Small chloroplast in the corner — highlights the region the scene zooms into. */
function Locator({ scene }: { scene: number }) {
  const region = scene === 1 || scene === 2 ? 'granum' : scene === 3 ? 'stroma' : null
  return (
    <g opacity="0.9">
      <ellipse cx="654" cy="34" rx="42" ry="24" fill={STROMA} stroke={S} strokeWidth="1.4" />
      <ellipse cx="654" cy="34" rx="37" ry="19" fill="none" stroke={S} strokeWidth="0.8" opacity="0.6" />
      {region === 'stroma' ? <ellipse cx="654" cy="34" rx="42" ry="24" fill={CARBON} opacity="0.2" /> : null}
      {[630, 654, 678].map((x) => (
        <g key={x} opacity={region === 'granum' ? 1 : 0.45}>
          {[0, 1, 2].map((j) => (
            <rect key={j} x={x - 8} y={28 + j * 4.5} width="16" height="3" rx="1.5" fill={S} opacity={0.75} />
          ))}
        </g>
      ))}
      {region === 'granum' ? (
        <rect x="616" y="22" width="76" height="26" rx="6" fill="none" stroke={LIGHT} strokeWidth="1.6" className="dgm-hue" />
      ) : null}
      <text x="654" y="70" textAnchor="middle" fontSize="9" fill={T} opacity="0.7">
        {region === 'granum' ? 'in the granum' : region === 'stroma' ? 'in the stroma' : 'chloroplast'}
      </text>
    </g>
  )
}

/* ── Scene 0 — the chloroplast ─────────────────────────────────────────── */

const CP = { cx: 270, cy: 236, rx: 178, ry: 104 }

function SceneChloroplast({ active }: SceneProps) {
  const labels = [
    { text: 'outer membrane', ty: 150, lx: 372, ly: 152 },
    { text: 'inner membrane', ty: 172, lx: 399, ly: 174 },
    { text: 'granum — a stack of thylakoids', ty: 210, lx: 360, ly: 200 },
    { text: 'thylakoid: light-dependent reactions', ty: 232, lx: 358, ly: 214 },
    { text: 'lamella links the grana', ty: 260, lx: 312, ly: 232 },
    { text: 'starch grain (stored product)', ty: 288, lx: 376, ly: 288 },
    { text: 'circular DNA + 70S ribosomes', ty: 316, lx: 268, ly: 304 },
  ]

  return (
    <g>
      {/* envelope — outer and inner membranes */}
      <ellipse cx={CP.cx} cy={CP.cy} rx={CP.rx} ry={CP.ry} fill={STROMA} stroke={S} strokeWidth="2.4" />
      <ellipse cx={CP.cx} cy={CP.cy} rx={CP.rx - 8} ry={CP.ry - 8} fill="none" stroke={S} strokeWidth="1.4" opacity="0.7" />

      {/* grana */}
      {[
        { x: 170, y: 208, n: 5 },
        { x: 256, y: 262, n: 6 },
        { x: 330, y: 198, n: 5 },
        { x: 196, y: 296, n: 4 },
      ].map((g) => (
        <g key={`${g.x}-${g.y}`}>
          {Array.from({ length: g.n }, (_, i) => (
            <rect
              key={i}
              x={g.x - 26}
              y={g.y - (g.n * 7) / 2 + i * 7}
              width="52"
              height="5"
              rx="2.5"
              fill={MEMBRANE}
              stroke={S}
              strokeWidth="1"
            />
          ))}
        </g>
      ))}

      {/* intergranal lamellae */}
      <path d="M 196 208 C 222 222 230 240 232 254" stroke={S} strokeWidth="2.4" fill="none" opacity="0.8" />
      <path d="M 282 256 C 306 248 314 222 308 206" stroke={S} strokeWidth="2.4" fill="none" opacity="0.8" />
      <path d="M 182 232 C 188 262 190 280 196 288" stroke={S} strokeWidth="2.4" fill="none" opacity="0.8" />

      {/* starch grain, plastid DNA, ribosomes */}
      <ellipse cx="352" cy="286" rx="22" ry="14" fill={CARBON} opacity="0.3" stroke={S} strokeWidth="1.2" />
      <path d="M 240 300 c 14 -12 34 -4 26 8 c -8 12 -30 6 -26 -8 z" fill="none" stroke={S} strokeWidth="1.6" />
      {[
        [148, 252],
        [160, 268],
        [300, 262],
        [312, 276],
        [216, 176],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill={S} opacity="0.6" />
      ))}

      {/* stroma named in the fluid itself */}
      <text x="272" y="166" fontSize="11" fill={T} textAnchor="middle" fontWeight="700" opacity="0.85">
        stroma
      </text>
      <text x="272" y="179" fontSize="9" fill={T} textAnchor="middle" opacity="0.7">
        (Calvin cycle)
      </text>

      {/* light in, glucose out */}
      <path
        d="M 70 110 L 148 178"
        stroke={LIGHT}
        strokeWidth="3"
        fill="none"
        markerEnd="url(#ps-arrow-light)"
        className={hue(active && 'dgm-flow')}
      />
      <text x="52" y="102" fontSize="12" fill={LIGHT} fontWeight="600" className="dgm-hue">
        light energy
      </text>

      <path d="M 176 318 L 106 354" stroke={CARBON} strokeWidth="2.4" fill="none" markerEnd="url(#ps-arrow-carbon)" className="dgm-hue" />
      <text x="58" y="372" fontSize="12" fill={CARBON} fontWeight="600" className="dgm-hue">
        glucose
      </text>

      {labels.map((l) => (
        <g key={l.text}>
          <Leader x1={464} y1={l.ty - 4} x2={l.lx} y2={l.ly} />
          <text x={470} y={l.ty} fontSize="10.5" fill={T}>
            {l.text}
          </text>
        </g>
      ))}

      <text x="270" y="400" textAnchor="middle" fontSize="12.5" fill={T} fontWeight="700">
        6CO₂ + 6H₂O →(light, chlorophyll)→ C₆H₁₂O₆ + 6O₂
      </text>
    </g>
  )
}

/* ── Scene 1 — pigments and the absorption spectrum ────────────────────── */

/** Maps a wavelength in nm onto the plot's x axis. */
function nm(w: number) {
  return 78 + ((w - 400) / 300) * 300
}
/** Maps relative absorption (0–1) onto the plot's y axis. */
function ab(a: number) {
  return 300 - a * 170
}

/**
 * Samples a sum of Gaussian absorption bands into a polyline. Sampling rather
 * than hand-placing bezier controls matters here: a cubic's control points
 * overshoot, so a curve drawn to "peak at 0.95" actually tops out near 0.5 and
 * the plot understates how strongly chlorophyll absorbs red and blue.
 */
function spectrumPath(bands: [number, number, number][], floor: number) {
  const pts: string[] = []
  for (let w = 400; w <= 700; w += 3) {
    const a = bands.reduce(
      (sum, [mu, sigma, amp]) => sum + amp * Math.exp(-((w - mu) ** 2) / (2 * sigma * sigma)),
      floor
    )
    pts.push(`${nm(w).toFixed(1)} ${ab(Math.min(a, 1)).toFixed(1)}`)
  }
  return `M ${pts.join(' L ')}`
}

function SceneSpectrum({ active }: SceneProps) {
  // Amplitudes leave headroom above the tallest peak for the wavelength labels.
  const chlA = spectrumPath([[430, 26, 0.86], [662, 16, 0.72]], 0.05)
  const chlB = spectrumPath([[453, 24, 0.68], [642, 16, 0.46]], 0.04)
  const caro = spectrumPath([[448, 26, 0.58], [478, 24, 0.44]], 0.02)

  return (
    <g>
      {/* green band — the wavelengths chlorophyll reflects */}
      <rect x={nm(500)} y={ab(1)} width={nm(570) - nm(500)} height={ab(0) - ab(1)} fill="#4caf50" opacity="0.12" className="dgm-hue" />
      <text x={nm(535)} y="200" fontSize="10" fill={T} textAnchor="middle">
        green reflected
      </text>
      <text x={nm(535)} y="214" fontSize="9" fill={T} textAnchor="middle" opacity="0.72">
        → leaves look green
      </text>

      {/* axes */}
      <path d={`M 78 ${ab(0)} L 78 112`} stroke={S} strokeWidth="1.6" fill="none" />
      <path d={`M 78 ${ab(0)} L 386 ${ab(0)}`} stroke={S} strokeWidth="1.6" fill="none" />
      <text x="46" y="210" fontSize="10.5" fill={T} transform="rotate(-90 46 210)" textAnchor="middle">
        absorption
      </text>

      {/* visible spectrum bar */}
      <rect x="78" y="308" width="300" height="11" fill="url(#ps-visible)" rx="2" opacity="0.85" />
      {[400, 500, 600, 700].map((w) => (
        <text key={w} x={nm(w)} y="334" fontSize="9.5" fill={T} textAnchor="middle" opacity="0.8">
          {w}
        </text>
      ))}
      <text x="228" y="350" fontSize="10" fill={T} textAnchor="middle" opacity="0.8">
        wavelength / nm
      </text>

      {/* curves */}
      <path d={caro} stroke={LIGHT} strokeWidth="2" fill="none" opacity="0.9" className={hue(active && 'dgm-draw dgm-delay-2')} style={drawLen} />
      <path d={chlB} stroke={WATER} strokeWidth="2.2" fill="none" className={hue(active && 'dgm-draw dgm-delay-1')} style={drawLen} />
      <path d={chlA} stroke={CARBON} strokeWidth="2.8" fill="none" className={hue(active && 'dgm-draw')} style={drawLen} />

      {/* peak wavelengths — the two exam-quotable numbers */}
      <text x={nm(430)} y="136" fontSize="9.5" fill={T} textAnchor="middle">
        430 nm
      </text>
      <text x={nm(662) + 8} y="164" fontSize="9.5" fill={T}>
        662 nm
      </text>

      {/* legend, in the empty trough above the curves */}
      {[
        { c: CARBON, t: 'chlorophyll a (primary pigment)' },
        { c: WATER, t: 'chlorophyll b (accessory)' },
        { c: LIGHT, t: 'carotenoids (accessory)' },
      ].map((l, i) => (
        <g key={l.t}>
          <rect x="132" y={124 + i * 16} width="15" height="3.5" rx="1.75" fill={l.c} className="dgm-hue" />
          <text x="154" y={128 + i * 16} fontSize="9.5" fill={T}>
            {l.t}
          </text>
        </g>
      ))}

      <text x="228" y="378" fontSize="10" fill={T} textAnchor="middle" opacity="0.85">
        The action spectrum matches this closely — evidence these pigments drive the reaction.
      </text>

      {/* antenna complex */}
      <text x="566" y="104" fontSize="12" fill={T} fontWeight="700" textAnchor="middle">
        Photosystem (antenna complex)
      </text>
      {[480, 530, 580, 630].map((x, i) => (
        <path
          key={x}
          d={`M ${x} 118 l 5 9 l -5 9 l 5 9 l -5 9 l 5 9 l -5 7`}
          stroke={LIGHT}
          strokeWidth="2"
          fill="none"
          markerEnd="url(#ps-arrow-light)"
          className={hue(active && 'dgm-pulse')}
          style={active ? { animationDelay: `${i * 0.3}s` } : undefined}
        />
      ))}
      <path d="M 452 172 L 680 172 L 596 274 L 536 274 Z" fill={MEMBRANE} stroke={S} strokeWidth="1.6" />
      {[
        [490, 192],
        [520, 192],
        [550, 192],
        [580, 192],
        [610, 192],
        [640, 192],
        [512, 218],
        [542, 218],
        [572, 218],
        [602, 218],
        [532, 244],
        [562, 244],
        [592, 244],
      ].map(([x, y], i) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r="7"
          fill={i % 3 === 0 ? CARBON : i % 3 === 1 ? WATER : LIGHT}
          opacity="0.55"
          stroke={S}
          strokeWidth="0.8"
          className={active ? 'dgm-pulse' : undefined}
          style={active ? { animationDelay: `${(i % 5) * 0.28}s` } : undefined}
        />
      ))}
      <path d="M 566 280 L 566 296" stroke={S} strokeWidth="2" markerEnd="url(#ps-arrow)" fill="none" />
      <circle cx="566" cy="314" r="16" fill={CARBON} opacity="0.75" stroke={S} strokeWidth="1.6" />
      <text x="566" y="318" fontSize="9.5" fill={T} textAnchor="middle" fontWeight="700">
        P680
      </text>
      <text x="566" y="348" fontSize="10.5" fill={T} textAnchor="middle">
        reaction centre — chlorophyll a
      </text>
      <text x="566" y="364" fontSize="9.5" fill={T} textAnchor="middle" opacity="0.78">
        accessory pigments widen the range absorbed
      </text>
      <text x="566" y="378" fontSize="9.5" fill={T} textAnchor="middle" opacity="0.78">
        and funnel that energy inwards
      </text>
    </g>
  )
}

/* ── Scene 2 — light-dependent reactions ───────────────────────────────── */

const MEM_TOP = 236
const MEM_BOT = 278

function SceneLightDependent({ active }: SceneProps) {
  const flow = active ? 'dgm-flow' : undefined
  const top = MEM_TOP - 8
  const bot = MEM_BOT + 8

  const complexes = [
    { x: 96, w: 64, label: 'PSII', sub: 'P680' },
    { x: 190, w: 42, label: 'PQ' },
    { x: 258, w: 76, label: 'cyt b₆f' },
    { x: 364, w: 40, label: 'PC' },
    { x: 430, w: 64, label: 'PSI', sub: 'P700' },
    { x: 576, w: 92, label: 'ATP synthase' },
  ]

  return (
    <g>
      {/* compartments */}
      <rect x="40" y="100" width="640" height={MEM_TOP - 100} fill={STROMA} opacity="0.6" />
      <rect x="40" y={MEM_BOT} width="640" height={368 - MEM_BOT} fill={WATER} opacity="0.1" className="dgm-hue" />
      <text x="52" y="118" fontSize="11" fill={T} fontWeight="700" opacity="0.8">
        STROMA
      </text>
      <text x="52" y="362" fontSize="11" fill={T} fontWeight="700" opacity="0.8">
        THYLAKOID LUMEN
      </text>

      {/* membrane */}
      <rect x="40" y={MEM_TOP} width="640" height={MEM_BOT - MEM_TOP} fill={MEMBRANE} stroke={S} strokeWidth="1.4" />

      {/* photons striking the two photosystems */}
      {[
        { x: 128, delay: 0 },
        { x: 462, delay: 0.45 },
      ].map((p) => (
        <g key={p.x}>
          <path
            d={`M ${p.x} 104 l 6 14 l -6 14 l 6 14 l -6 14 l 6 14 l -6 14 l 6 14 l -6 12`}
            stroke={LIGHT}
            strokeWidth="2.4"
            fill="none"
            markerEnd="url(#ps-arrow-light)"
            className={hue(active && 'dgm-pulse')}
            style={active ? { animationDelay: `${p.delay}s` } : undefined}
          />
          <text x={p.x + 12} y="100" fontSize="10" fill={LIGHT} fontWeight="600" className="dgm-hue">
            photon
          </text>
        </g>
      ))}

      {/* embedded complexes */}
      {complexes.map((c) => (
        <g key={c.label}>
          <rect x={c.x} y={top} width={c.w} height={bot - top} rx="7" fill={SURFACE} stroke={S} strokeWidth="1.8" />
          <text x={c.x + c.w / 2} y={c.sub ? MEM_TOP + 18 : MEM_TOP + 26} fontSize="10.5" fill={T} textAnchor="middle" fontWeight="700">
            {c.label}
          </text>
          {c.sub ? (
            <text x={c.x + c.w / 2} y={MEM_TOP + 34} fontSize="9" fill={T} textAnchor="middle" opacity="0.75">
              {c.sub}
            </text>
          ) : null}
        </g>
      ))}

      {/* electron transport chain, hopping carrier to carrier */}
      <path
        d={`M 128 ${top} C 142 198 190 198 211 ${top}
            M 211 ${top} C 226 200 278 200 296 ${top}
            M 296 ${top} C 312 202 366 202 384 ${top}
            M 384 ${top} C 400 200 444 200 462 ${top}`}
        stroke={CARRIER}
        strokeWidth="2.4"
        fill="none"
        className={hue(flow)}
      />
      <text x="295" y="178" fontSize="10" fill={CARRIER} fontWeight="600" textAnchor="middle" className="dgm-hue">
        electron transport chain — e⁻ lose energy at each carrier
      </text>

      {/* PSI → ferredoxin → NADP reductase → NADPH */}
      <path d={`M 462 ${top} C 478 198 496 190 499 190`} stroke={CARRIER} strokeWidth="2.4" fill="none" className={hue(flow)} />
      <circle cx="512" cy="190" r="13" fill={SURFACE} stroke={S} strokeWidth="1.6" />
      <text x="512" y="194" fontSize="9" fill={T} textAnchor="middle" fontWeight="700">
        Fd
      </text>
      <path d="M 526 190 L 548 190" stroke={CARRIER} strokeWidth="2.4" fill="none" markerEnd="url(#ps-arrow-carrier)" className={hue(flow)} />
      <text x="556" y="176" fontSize="9.5" fill={T}>
        NADP reductase
      </text>
      <text x="556" y="194" fontSize="12" fill={CARRIER} fontWeight="700" className="dgm-hue">
        NADP⁺ → NADPH
      </text>

      {/* chemiosmosis through ATP synthase */}
      <path d="M 622 308 L 622 224" stroke={CARRIER} strokeWidth="2.6" fill="none" markerEnd="url(#ps-arrow-carrier)" className={hue(flow)} />
      <text x="622" y="218" fontSize="12" fill={CARRIER} textAnchor="middle" fontWeight="700" className="dgm-hue">
        ADP + Pi → ATP
      </text>

      {/* proton gradient — kept clear of the complexes above and the box below */}
      {[272, 306, 340, 374, 408, 442, 476, 510, 544].map((x, i) => (
        <text
          key={x}
          x={x}
          y="300"
          fontSize="10.5"
          fill={CARRIER}
          textAnchor="middle"
          fontWeight="700"
          className={hue(active && 'dgm-pulse')}
          style={active ? { animationDelay: `${(i % 4) * 0.3}s` } : undefined}
        >
          H⁺
        </text>
      ))}
      <path d={`M 296 ${MEM_TOP - 4} L 296 292`} stroke={CARRIER} strokeWidth="2" fill="none" markerEnd="url(#ps-arrow-carrier)" opacity="0.85" className="dgm-hue" />
      <text x="396" y="326" fontSize="9.5" fill={T} opacity="0.82">
        H⁺ pumped in — a gradient builds across the membrane
      </text>
      <text x="622" y="348" fontSize="9.5" fill={T} textAnchor="middle" opacity="0.82">
        chemiosmosis
      </text>

      {/* photolysis of water in the lumen */}
      <rect x="58" y="296" width="188" height="46" rx="8" fill={SURFACE} stroke={WATER} strokeWidth="1.6" className="dgm-hue" />
      <text x="152" y="314" fontSize="10" fill={T} textAnchor="middle" fontWeight="700">
        photolysis of water
      </text>
      <text x="152" y="332" fontSize="11" fill={WATER} textAnchor="middle" fontWeight="700" className="dgm-hue">
        2H₂O → 4H⁺ + O₂ + 4e⁻
      </text>
      <path d="M 128 296 L 128 288" stroke={CARRIER} strokeWidth="2" fill="none" markerEnd="url(#ps-arrow-carrier)" className="dgm-hue" />
      <path d="M 248 320 L 296 320" stroke={WATER} strokeWidth="2.4" fill="none" markerEnd="url(#ps-arrow-water)" className={hue(flow)} />
      <text x="302" y="324" fontSize="11" fill={WATER} fontWeight="700" className="dgm-hue">
        O₂ out
      </text>

      <text x="360" y="390" textAnchor="middle" fontSize="11" fill={T}>
        <tspan fill={CARRIER} fontWeight="700" className="dgm-hue">
          ATP
        </tspan>{' '}
        and{' '}
        <tspan fill={CARRIER} fontWeight="700" className="dgm-hue">
          NADPH
        </tspan>{' '}
        pass into the stroma to drive the Calvin cycle.
      </text>
      <text x="360" y="408" textAnchor="middle" fontSize="10" fill={T} opacity="0.78">
        Non-cyclic photophosphorylation — both photosystems, water split, NADPH made.
      </text>
    </g>
  )
}

/* ── Scene 3 — the Calvin cycle ────────────────────────────────────────── */

const CY = { cx: 300, cy: 228, r: 94 }

/** Point on the cycle ring, degrees measured clockwise from the top. */
function ring(deg: number, radius = CY.r) {
  const rad = (deg * Math.PI) / 180
  return [CY.cx + radius * Math.sin(rad), CY.cy - radius * Math.cos(rad)] as const
}

function SceneCalvin({ active }: SceneProps) {
  const flow = active ? 'dgm-flow' : undefined
  const arc = (from: number, to: number) => {
    const [x1, y1] = ring(from)
    const [x2, y2] = ring(to)
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${CY.r} ${CY.r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`
  }

  return (
    <g>
      <circle cx={CY.cx} cy={CY.cy} r={CY.r} fill="none" stroke={S} strokeWidth="2" opacity="0.28" strokeDasharray="4 6" />

      {/* clockwise: RuBP (top) → GP (right) → TP (left) → RuBP.
          Angles are chosen so each arc starts and ends just outside a station box. */}
      {[
        [35, 105],
        [145, 215],
        [250, 325],
      ].map(([f, t]) => (
        <path key={f} d={arc(f, t)} stroke={CARBON} strokeWidth="3" fill="none" markerEnd="url(#ps-arrow-carbon)" className={hue(flow)} />
      ))}

      {/* stations */}
      {[
        { x: CY.cx, y: CY.cy - CY.r, title: 'RuBP', sub: '5C · ×6' },
        { x: CY.cx + 86, y: CY.cy + 50, title: 'GP', sub: '3C · ×12' },
        { x: CY.cx - 86, y: CY.cy + 50, title: 'TP', sub: '3C · ×12' },
      ].map((st) => (
        <g key={st.title}>
          <rect x={st.x - 42} y={st.y - 20} width="84" height="40" rx="9" fill={SURFACE} stroke={CARBON} strokeWidth="2" className="dgm-hue" />
          <text x={st.x} y={st.y - 3} fontSize="12.5" fill={T} textAnchor="middle" fontWeight="700">
            {st.title}
          </text>
          <text x={st.x} y={st.y + 13} fontSize="9.5" fill={T} textAnchor="middle" opacity="0.8">
            {st.sub}
          </text>
        </g>
      ))}

      {/* stage names sit inside the ring, beside the arc they describe */}
      <text x="344" y="214" fontSize="10.5" fill={T} textAnchor="middle" fontWeight="600">
        carboxylation
      </text>
      <text x={CY.cx} y="292" fontSize="10.5" fill={T} textAnchor="middle" fontWeight="600">
        reduction
      </text>
      <text x="258" y="214" fontSize="10.5" fill={T} textAnchor="middle" fontWeight="600">
        regeneration
      </text>

      {/* CO2 fixed onto RuBP */}
      <path d="M 120 104 L 254 124" stroke={CARBON} strokeWidth="2.6" fill="none" markerEnd="url(#ps-arrow-carbon)" className={hue(flow)} />
      <text x="92" y="98" fontSize="13" fill={CARBON} textAnchor="middle" fontWeight="700" className="dgm-hue">
        6CO₂
      </text>
      <text x="176" y="140" fontSize="10.5" fill={T} textAnchor="middle" opacity="0.9">
        fixed by rubisco
      </text>

      {/* ATP + NADPH drive the reduction step */}
      <path d="M 452 338 L 380 306" stroke={CARRIER} strokeWidth="2.4" fill="none" markerEnd="url(#ps-arrow-carrier)" className={hue(flow)} />
      <text x="460" y="352" fontSize="11.5" fill={CARRIER} fontWeight="700" className="dgm-hue">
        12 ATP + 12 NADPH
      </text>

      {/* ATP drives regeneration */}
      <path d="M 142 186 L 206 200" stroke={CARRIER} strokeWidth="2.4" fill="none" markerEnd="url(#ps-arrow-carrier)" className={hue(flow)} />
      <text x="120" y="180" fontSize="11.5" fill={CARRIER} textAnchor="middle" fontWeight="700" className="dgm-hue">
        6 ATP
      </text>
      <text x="150" y="336" fontSize="10" fill={T} textAnchor="middle" opacity="0.85">
        10 of the 12 TP rebuild RuBP
      </text>

      {/* product leaves the cycle */}
      <path d="M 172 278 L 118 278" stroke={CARBON} strokeWidth="2.6" fill="none" markerEnd="url(#ps-arrow-carbon)" className={hue(flow)} />
      <text x="112" y="270" fontSize="11" fill={CARBON} textAnchor="end" fontWeight="700" className="dgm-hue">
        2 TP leave
      </text>
      <text x="112" y="286" fontSize="10" fill={T} textAnchor="end" opacity="0.85">
        → glucose, starch,
      </text>
      <text x="112" y="300" fontSize="10" fill={T} textAnchor="end" opacity="0.85">
        amino acids, lipids
      </text>

      <text x="360" y="404" textAnchor="middle" fontSize="10.5" fill={T} opacity="0.85">
        Light-independent — but it stops in the dark, because it runs on ATP and NADPH from the light reactions.
      </text>
    </g>
  )
}

/* ── Shell ─────────────────────────────────────────────────────────────── */

const SCENES = [
  {
    title: 'Where photosynthesis happens — the chloroplast',
    subtitle: 'Light energy is trapped and stored as chemical energy in organic molecules.',
    Scene: SceneChloroplast,
    aria:
      'Chloroplast cross-section showing the double membrane envelope, stroma, grana of stacked thylakoids, lamellae, starch grain and circular DNA, with light entering and glucose produced.',
  },
  {
    title: 'Trapping the light — photosynthetic pigments',
    subtitle: 'Chlorophyll a absorbs blue and red strongly; green is reflected.',
    Scene: SceneSpectrum,
    aria:
      'Absorption spectrum for chlorophyll a, chlorophyll b and carotenoids from 400 to 700 nanometres, beside a photosystem antenna complex funnelling absorbed energy to the P680 reaction centre.',
  },
  {
    title: 'Light-dependent reactions — in the thylakoid membrane',
    subtitle: 'Water is split, electrons flow down the chain, and ATP and NADPH are made.',
    Scene: SceneLightDependent,
    aria:
      'Thylakoid membrane showing photosystem two, plastoquinone, cytochrome b6f, plastocyanin, photosystem one, ferredoxin and ATP synthase, with photolysis of water in the lumen, a proton gradient, and ATP and NADPH produced in the stroma.',
  },
  {
    title: 'Calvin cycle — carbon fixation in the stroma',
    subtitle: 'CO₂ is fixed onto RuBP and reduced to triose phosphate.',
    Scene: SceneCalvin,
    aria:
      'Calvin cycle showing carbon dioxide fixed onto RuBP by rubisco to form GP, reduction of GP to triose phosphate using ATP and NADPH, regeneration of RuBP, and triose phosphate leaving to form glucose and starch.',
  },
]

export function PhotosynthesisDiagram({
  className = '',
  stepIndex = 0,
}: LessonDiagramComponentProps) {
  const index = Math.min(Math.max(stepIndex, 0), SCENES.length - 1)
  const { title, subtitle, Scene, aria } = SCENES[index]

  return (
    <div className={`lesson-diagram-scroll ${className}`.trim()}>
      <svg
        viewBox="0 0 720 420"
        className="lesson-diagram-svg lesson-diagram-svg--dense"
        role="img"
        aria-label={aria}
      >
        <ArrowDefs />

        <text x="20" y="26" fontSize="15" fill={T} fontWeight="700">
          {title}
        </text>
        <text x="20" y="44" fontSize="11" fill={T} opacity="0.78">
          {subtitle}
        </text>

        <Locator scene={index} />

        {/* remount per scene so the draw-in animations replay on step change */}
        <g key={index}>
          <Scene active />
        </g>
      </svg>
    </div>
  )
}
