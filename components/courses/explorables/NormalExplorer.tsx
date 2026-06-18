'use client'

/**
 * Normal Distribution Explorer — drag μ and σ to reshape the bell curve, and
 * drag the two boundaries to shade P(a < X < b). Areas are computed from a
 * normal CDF (erf approximation). Beats: shape → standardising (z) → between.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { InlineMath } from 'react-katex'
import type { ExplorableProps } from './registry'

const W = 500
const H = 330
const PAD_X = 28
const PAD_T = 22
const PAD_B = 40
const X_MIN = -1
const X_MAX = 21
const Y_MAX = 0.45
const N = 160

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number, dp = 2) => {
  const r = Number(v.toFixed(dp))
  return Object.is(r, -0) ? 0 : r
}
const sx = (x: number) => PAD_X + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - 2 * PAD_X)
const sy = (y: number) => H - PAD_B - (y / Y_MAX) * (H - PAD_T - PAD_B)

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x))
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x)
  return x >= 0 ? y : -y
}
const Phi = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2))

type Beat = 'shape' | 'standardise' | 'between'
const BEATS: Beat[] = ['shape', 'standardise', 'between']

export function NormalExplorer({ step, stepCount }: ExplorableProps) {
  const [mu, setMu] = useState(10)
  const [sigma, setSigma] = useState(3)
  const [a, setA] = useState(7)
  const [b, setB] = useState(13)
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<null | 'a' | 'b'>(null)
  const beat = BEATS[clamp(step, 0, stepCount - 1)] ?? 'shape'

  const pdf = useCallback(
    (x: number) => Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI)),
    [mu, sigma]
  )

  const curve = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= N; i++) {
      const x = X_MIN + (i / N) * (X_MAX - X_MIN)
      pts.push(`${i === 0 ? 'M' : 'L'}${fmt(sx(x), 1)},${fmt(sy(pdf(x)), 1)}`)
    }
    return pts.join(' ')
  }, [pdf])

  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  const shade = useMemo(() => {
    const pts: string[] = [`M${fmt(sx(lo), 1)},${fmt(sy(0), 1)}`]
    const steps = 80
    for (let i = 0; i <= steps; i++) {
      const x = lo + (i / steps) * (hi - lo)
      pts.push(`L${fmt(sx(x), 1)},${fmt(sy(pdf(x)), 1)}`)
    }
    pts.push(`L${fmt(sx(hi), 1)},${fmt(sy(0), 1)} Z`)
    return pts.join(' ')
  }, [lo, hi, pdf])

  const pBetween = Phi((hi - mu) / sigma) - Phi((lo - mu) / sigma)
  const za = (lo - mu) / sigma
  const zb = (hi - mu) / sigma

  const moveTo = useCallback(
    (clientX: number, which: 'a' | 'b') => {
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const px = ((clientX - rect.left) / rect.width) * W
      const x = clamp(X_MIN + ((px - PAD_X) / (W - 2 * PAD_X)) * (X_MAX - X_MIN), X_MIN, X_MAX)
      if (which === 'a') setA(fmt(x, 1))
      else setB(fmt(x, 1))
    },
    []
  )
  const onDown = (which: 'a' | 'b') => (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setDrag(which)
    moveTo(e.clientX, which)
  }
  const onMove = (e: React.PointerEvent) => {
    if (drag) moveTo(e.clientX, drag)
  }
  const onUp = (e: React.PointerEvent) => {
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    setDrag(null)
  }

  // Plain JSX-returning helper (not a component) — keeps the React Compiler happy.
  const renderHandle = (which: 'a' | 'b', x: number) => (
    <g
      key={which}
      className={`norm-handle${drag === which ? ' grab' : ''}`}
      onPointerDown={onDown(which)}
      onPointerMove={onMove}
      onPointerUp={onUp}
      style={{ cursor: 'ew-resize' }}
    >
      <line x1={sx(x)} y1={sy(0)} x2={sx(x)} y2={sy(Y_MAX) - 4} className="norm-handle-line" />
      <rect x={sx(x) - 7} y={sy(0)} width={14} height={16} rx={3} className="norm-handle-grip" />
      <text x={sx(x)} y={sy(0) + 12} className="norm-handle-label mono">{which}</text>
    </g>
  )

  return (
    <div className="qex normal" data-beat={beat}>
      <div className="qex-stagewrap">
        <svg ref={svgRef} className="qex-svg" viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Normal curve mean ${mu}, sd ${sigma}. P(${fmt(lo)}<X<${fmt(hi)}) = ${fmt(pBetween, 3)}.`}>
          <line className="qex-axis" x1={sx(X_MIN)} y1={sy(0)} x2={sx(X_MAX)} y2={sy(0)} />
          {/* shaded probability */}
          <path className="norm-shade" d={shade} />
          {/* mean line */}
          <line className="norm-mean" x1={sx(mu)} y1={sy(0)} x2={sx(mu)} y2={sy(pdf(mu))} />
          {/* curve */}
          <path className="qex-curve" d={curve} fill="none" />
          {renderHandle('a', a)}
          {renderHandle('b', b)}
        </svg>
        <p className="qex-draghint micro">drag a and b to shade a probability · sliders reshape the curve</p>
      </div>

      <div className="qex-panel">
        <div className="qex-eq">
          <span className="qex-eq-row"><span className="qex-eq-tag mono">DIST</span> <InlineMath math={`X \\sim N(${fmt(mu)},\\, ${fmt(sigma)}^2)`} /></span>
        </div>
        <div className={`qex-disc tone-pos${beat === 'between' ? ' hot' : ''}`}>
          <span className="qex-disc-val mono">P({fmt(lo)} &lt; X &lt; {fmt(hi)})</span>
          <span className="qex-disc-label">{fmt(pBetween, 4)}</span>
        </div>
        <dl className="qex-readout">
          <div className={beat === 'standardise' ? 'rd-hot' : ''}><dt>z at a</dt><dd className="mono">{fmt(za, 2)}</dd></div>
          <div className={beat === 'standardise' ? 'rd-hot' : ''}><dt>z at b</dt><dd className="mono">{fmt(zb, 2)}</dd></div>
          <div><dt>P(X &lt; a)</dt><dd className="mono">{fmt(Phi(za), 3)}</dd></div>
          <div><dt>P(X &gt; b)</dt><dd className="mono">{fmt(1 - Phi(zb), 3)}</dd></div>
        </dl>
        <div className="qex-controls">
          <Slider label="μ (mean)" value={mu} min={4} max={16} step={0.5} onChange={setMu} />
          <Slider label="σ (sd)" value={sigma} min={1} max={5} step={0.25} onChange={setSigma} />
        </div>
      </div>
    </div>
  )
}

function Slider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) {
  return (
    <label className="qex-slider">
      <span className="qex-slider-head">
        <span className="qex-slider-label mono">{label}</span>
        <span className="qex-slider-val mono">{fmt(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </label>
  )
}
