'use client'

/**
 * Integration Explorer — the definite integral as the limit of a Riemann sum.
 * Slide the number of rectangles n and watch the sum of their areas converge on
 * the exact area under the curve. Beats: the area → the rectangles → the limit.
 */

import { useMemo, useState } from 'react'
import { InlineMath } from 'react-katex'
import type { ExplorableProps } from './registry'

const W = 470
const H = 360
const PAD_L = 34
const PAD_R = 16
const PAD_T = 18
const PAD_B = 30
const A = 0 // lower limit
const B = 6 // upper limit
const X_MAX = 6
const Y_MAX = 4.4
const EXACT = 19.5 // ∫₀⁶ [4 − ¼(x−3)²] dx

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number, dp = 2) => {
  const r = Number(v.toFixed(dp))
  return Object.is(r, -0) ? 0 : r
}
const f = (x: number) => 4 - 0.25 * (x - 3) ** 2
const sx = (x: number) => PAD_L + (x / X_MAX) * (W - PAD_L - PAD_R)
const sy = (y: number) => H - PAD_B - (y / Y_MAX) * (H - PAD_T - PAD_B)

type Beat = 'area' | 'rectangles' | 'limit'
const BEATS: Beat[] = ['area', 'rectangles', 'limit']

export function IntegrationExplorer({ step, stepCount }: ExplorableProps) {
  const [n, setN] = useState(6)
  const beat = BEATS[clamp(step, 0, stepCount - 1)] ?? 'area'

  const dx = (B - A) / n
  const { rects, sum } = useMemo(() => {
    const rects: { x: number; w: number; h: number }[] = []
    let s = 0
    for (let i = 0; i < n; i++) {
      const xL = A + i * dx
      const h = f(xL + dx / 2) // midpoint rule — converges nicely
      s += h * dx
      rects.push({ x: xL, w: dx, h })
    }
    return { rects, sum: s }
  }, [n, dx])

  const curve = useMemo(() => {
    const pts: string[] = []
    const steps = 160
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * X_MAX
      pts.push(`${i === 0 ? 'M' : 'L'}${fmt(sx(x), 1)},${fmt(sy(f(x)), 1)}`)
    }
    return pts.join(' ')
  }, [])

  const exactArea = useMemo(() => {
    const pts: string[] = [`M${fmt(sx(A), 1)},${fmt(sy(0), 1)}`]
    const steps = 120
    for (let i = 0; i <= steps; i++) {
      const x = A + (i / steps) * (B - A)
      pts.push(`L${fmt(sx(x), 1)},${fmt(sy(f(x)), 1)}`)
    }
    pts.push(`L${fmt(sx(B), 1)},${fmt(sy(0), 1)} Z`)
    return pts.join(' ')
  }, [])

  const err = sum - EXACT

  return (
    <div className="qex integration" data-beat={beat}>
      <div className="qex-stagewrap">
        <svg className="qex-svg" viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Riemann sum with ${n} rectangles ≈ ${fmt(sum)}, exact ${EXACT}.`}>
          <line className="qex-axis" x1={sx(0)} y1={sy(0)} x2={sx(X_MAX)} y2={sy(0)} />
          <line className="qex-axis" x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(Y_MAX)} />
          {/* exact shaded area */}
          {beat !== 'rectangles' ? <path className="int-area" d={exactArea} /> : null}
          {/* rectangles */}
          {rects.map((r, i) => (
            <rect key={i} className="int-rect" x={sx(r.x)} y={sy(r.h)} width={sx(r.x + r.w) - sx(r.x)} height={sy(0) - sy(r.h)} />
          ))}
          {/* the curve */}
          <path className="qex-curve" d={curve} fill="none" />
        </svg>
        <p className="qex-draghint micro">slide n — more rectangles converge on the exact area</p>
      </div>

      <div className="qex-panel">
        <div className="qex-eq">
          <span className="qex-eq-row"><span className="qex-eq-tag mono">AREA</span> <InlineMath math={'\\displaystyle\\int_0^6 \\big(4 - \\tfrac14(x-3)^2\\big)\\,dx'} /></span>
        </div>
        <div className={`qex-disc tone-pos${beat === 'limit' ? ' hot' : ''}`}>
          <span className="qex-disc-val mono">{n} rectangles → sum</span>
          <span className="qex-disc-label">{fmt(sum, 3)}</span>
        </div>
        <dl className="qex-readout">
          <div className={beat === 'limit' ? 'rd-hot' : ''}><dt>exact integral</dt><dd className="mono">{EXACT}</dd></div>
          <div className={beat === 'limit' ? 'rd-hot' : ''}><dt>error</dt><dd className="mono">{fmt(err, 4)}</dd></div>
          <div className={beat === 'rectangles' ? 'rd-hot' : ''}><dt>strip width Δx</dt><dd className="mono">{fmt(dx, 3)}</dd></div>
          <div><dt>rectangles n</dt><dd className="mono">{n}</dd></div>
        </dl>
        <div className="qex-controls">
          <label className="qex-slider">
            <span className="qex-slider-head"><span className="qex-slider-label mono">n (rectangles)</span><span className="qex-slider-val mono">{n}</span></span>
            <input type="range" min={1} max={60} step={1} value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="number of rectangles" />
          </label>
          <p className="diff-note body-2">As <InlineMath math={'n \\to \\infty'} /> the strip width Δx → 0 and the Riemann sum approaches the exact area — that limit <em>is</em> the definite integral.</p>
        </div>
      </div>
    </div>
  )
}
