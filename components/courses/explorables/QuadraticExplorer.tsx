'use client'

/**
 * Quadratic Explorer — a fully interactive coordinate-plane explorable for
 * 9709 Pure Maths 1 "Quadratics". Drag the vertex or move the a/b/c sliders and
 * everything updates live: the parabola, its roots, vertex, axis of symmetry and
 * the discriminant. The four guided "beats" (driven by the lesson's diagramSpec)
 * highlight a different feature each step.
 *
 * Built original + React-19-native (no external math lib) for full brand control.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { InlineMath } from 'react-katex'
import type { ExplorableProps } from './registry'

// Logical SVG canvas + visible data window.
const W = 460
const H = 400
const PAD = 30
const X_MIN = -10
const X_MAX = 10
const Y_MIN = -16
const Y_MAX = 16
const SAMPLES = 90

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number, dp = 2) => {
  const r = Number(v.toFixed(dp))
  return Object.is(r, -0) ? 0 : r
}

// Pretty LaTeX term builders so the equations read like a textbook (no "1x²").
const leadingTerm = (a: number) => (a === 1 ? 'x^2' : a === -1 ? '-x^2' : `${fmt(a)}x^2`)
const linearTerm = (b: number) => {
  const m = Math.abs(fmt(b))
  if (m === 0) return ''
  return ` ${b < 0 ? '-' : '+'} ${m === 1 ? 'x' : `${m}x`}`
}
const constTerm = (c: number) => {
  const m = Math.abs(fmt(c))
  return m === 0 ? '' : ` ${c < 0 ? '-' : '+'} ${m}`
}
const vertexLead = (a: number) => (a === 1 ? '' : a === -1 ? '-' : `${fmt(a)}`)
const vertexSquare = (h: number) => {
  const fh = fmt(h)
  if (fh === 0) return 'x^2'
  return `(x ${fh < 0 ? '+' : '-'} ${Math.abs(fh)})^2`
}

// data → svg pixel
const sx = (x: number) => PAD + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - 2 * PAD)
const sy = (y: number) => H - PAD - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (H - 2 * PAD)
// svg pixel → data
const dx = (px: number) => X_MIN + ((px - PAD) / (W - 2 * PAD)) * (X_MAX - X_MIN)
const dy = (py: number) => Y_MIN + ((H - PAD - py) / (H - 2 * PAD)) * (Y_MAX - Y_MIN)

type Beat = 'shape' | 'vertex' | 'discriminant' | 'roots'
const BEATS: Beat[] = ['shape', 'vertex', 'discriminant', 'roots']

function buildPath(a: number, b: number, c: number): string {
  const pts: string[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const x = X_MIN + (i / SAMPLES) * (X_MAX - X_MIN)
    const y = a * x * x + b * x + c
    // keep the path within a sane band so framer can morph d smoothly
    const yc = clamp(y, Y_MIN - 6, Y_MAX + 6)
    pts.push(`${i === 0 ? 'M' : 'L'}${fmt(sx(x), 1)},${fmt(sy(yc), 1)}`)
  }
  return pts.join(' ')
}

export function QuadraticExplorer({ step, stepCount }: ExplorableProps) {
  // Standard form coefficients: y = a x² + b x + c
  const [a, setA] = useState(1)
  const [b, setB] = useState(-2)
  const [c, setC] = useState(-3)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState(false)

  const beat = BEATS[clamp(step, 0, stepCount - 1)] ?? 'shape'

  const { h, k, disc, roots, path } = useMemo(() => {
    const aa = a === 0 ? 0.0001 : a
    const h = -b / (2 * aa)
    const k = c - (b * b) / (4 * aa)
    const disc = b * b - 4 * aa * c
    let roots: number[] = []
    if (disc >= 0) {
      const s = Math.sqrt(disc)
      roots = disc === 0 ? [(-b) / (2 * aa)] : [(-b - s) / (2 * aa), (-b + s) / (2 * aa)]
    }
    return { h, k, disc, roots, path: buildPath(aa, b, c) }
  }, [a, b, c])

  const discCase =
    disc > 1e-9
      ? { label: 'Two distinct real roots', tone: 'pos' as const }
      : disc < -1e-9
        ? { label: 'No real roots', tone: 'neg' as const }
        : { label: 'One repeated root', tone: 'mid' as const }

  // Drag the vertex: keep a fixed, derive b and c from the new (h, k).
  const moveVertexTo = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const px = ((clientX - rect.left) / rect.width) * W
      const py = ((clientY - rect.top) / rect.height) * H
      const nh = clamp(dx(px), X_MIN + 1, X_MAX - 1)
      const nk = clamp(dy(py), Y_MIN + 2, Y_MAX - 2)
      const aa = a === 0 ? 1 : a
      setB(clamp(fmt(-2 * aa * nh, 2), -40, 40))
      setC(clamp(fmt(nk + aa * nh * nh, 2), -60, 60))
    },
    [a]
  )

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setDragging(true)
    moveVertexTo(e.clientX, e.clientY)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    moveVertexTo(e.clientX, e.clientY)
  }
  const onPointerUp = (e: React.PointerEvent) => {
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    setDragging(false)
  }

  const gridX = [-8, -6, -4, -2, 2, 4, 6, 8]
  const gridY = [-12, -8, -4, 4, 8, 12]

  const eqStandard = `y = ${leadingTerm(a)}${linearTerm(b)}${constTerm(c)}`
  const eqVertex = `y = ${vertexLead(a)}${vertexSquare(h)}${constTerm(k)}`

  return (
    <div className="qex" data-beat={beat}>
      <div className="qex-stagewrap">
        <svg
          ref={svgRef}
          className="qex-svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Parabola for ${eqStandard}. Vertex at (${fmt(h)}, ${fmt(k)}). Discriminant ${fmt(disc)}.`}
        >
          {/* grid */}
          {gridX.map((x) => (
            <line key={`gx${x}`} className="qex-grid" x1={sx(x)} y1={sy(Y_MIN)} x2={sx(x)} y2={sy(Y_MAX)} />
          ))}
          {gridY.map((y) => (
            <line key={`gy${y}`} className="qex-grid" x1={sx(X_MIN)} y1={sy(y)} x2={sx(X_MAX)} y2={sy(y)} />
          ))}
          {/* axes */}
          <line className="qex-axis" x1={sx(X_MIN)} y1={sy(0)} x2={sx(X_MAX)} y2={sy(0)} />
          <line className="qex-axis" x1={sx(0)} y1={sy(Y_MIN)} x2={sx(0)} y2={sy(Y_MAX)} />

          {/* axis of symmetry */}
          <line
            className={`qex-symmetry${beat === 'vertex' ? ' hot' : ''}`}
            x1={sx(h)}
            y1={sy(Y_MIN)}
            x2={sx(h)}
            y2={sy(Y_MAX)}
          />

          {/* the parabola */}
          <motion.path
            className="qex-curve"
            d={path}
            animate={{ d: path }}
            transition={{ type: 'spring', stiffness: 220, damping: 30 }}
            fill="none"
          />

          {/* y-intercept */}
          <circle className="qex-yint" cx={sx(0)} cy={sy(c)} r={4} />

          {/* roots */}
          {roots.map((r, i) => (
            <g key={`root${i}`} className={`qex-root${beat === 'roots' ? ' hot' : ''}`}>
              <line className="qex-root-drop" x1={sx(r)} y1={sy(0)} x2={sx(r)} y2={sy(a * r * r + b * r + c)} />
              <circle cx={sx(r)} cy={sy(0)} r={5.5} />
            </g>
          ))}

          {/* draggable vertex */}
          <g
            className={`qex-vertex${dragging ? ' grab' : ''}${beat === 'vertex' ? ' hot' : ''}`}
            transform={`translate(${sx(h)}, ${sy(clamp(k, Y_MIN, Y_MAX))})`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
          >
            <circle className="qex-vertex-halo" r={14} />
            <circle className="qex-vertex-dot" r={6.5} />
          </g>
        </svg>
        <p className="qex-draghint micro">drag the vertex · or use the sliders</p>
      </div>

      <div className="qex-panel">
        <div className="qex-eq">
          <span className="qex-eq-row"><span className="qex-eq-tag mono">STANDARD</span> <InlineMath math={eqStandard} /></span>
          <span className="qex-eq-row"><span className="qex-eq-tag mono">VERTEX</span> <InlineMath math={eqVertex} /></span>
        </div>

        <div className={`qex-disc tone-${discCase.tone}${beat === 'discriminant' ? ' hot' : ''}`}>
          <span className="qex-disc-val mono">Δ = b² − 4ac = {fmt(disc)}</span>
          <span className="qex-disc-label">{discCase.label}</span>
        </div>

        <dl className="qex-readout">
          <div><dt>Vertex</dt><dd className="mono">({fmt(h)}, {fmt(k)})</dd></div>
          <div><dt>Axis of symmetry</dt><dd className="mono">x = {fmt(h)}</dd></div>
          <div>
            <dt>Roots</dt>
            <dd className="mono">{roots.length ? roots.map((r) => fmt(r, 2)).join(',  ') : '—'}</dd>
          </div>
          <div><dt>Opens</dt><dd>{a >= 0 ? 'upward (min)' : 'downward (max)'}</dd></div>
        </dl>

        <div className="qex-controls">
          <Slider label="a" value={a} min={-3} max={3} step={0.25} onChange={(v) => setA(v === 0 ? 0.25 : v)} />
          <Slider label="b" value={b} min={-12} max={12} step={0.5} onChange={setB} />
          <Slider label="c" value={c} min={-15} max={15} step={0.5} onChange={setC} />
          <button
            type="button"
            className="qex-reset"
            onClick={() => { setA(1); setB(-2); setC(-3) }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}

function Slider({
  label, value, min, max, step, onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="qex-slider">
      <span className="qex-slider-head">
        <span className="qex-slider-label mono">{label}</span>
        <span className="qex-slider-val mono">{fmt(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`coefficient ${label}`}
      />
    </label>
  )
}
