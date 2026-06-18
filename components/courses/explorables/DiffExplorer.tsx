'use client'

/**
 * Differentiation Explorer — drag a point along a cubic and see the tangent and
 * its gradient f'(x). The h slider shows the limit definition: the secant
 * through x and x+h sweeps onto the tangent as h → 0. Guided beats move from
 * tangent → secant limit → the gradient function.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { InlineMath } from 'react-katex'
import type { ExplorableProps } from './registry'

const W = 460
const H = 400
const PAD = 30
const X_MIN = -3.4
const X_MAX = 3.4
const Y_MIN = -11
const Y_MAX = 11
const N = 120

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number, dp = 2) => {
  const r = Number(v.toFixed(dp))
  return Object.is(r, -0) ? 0 : r
}
const sx = (x: number) => PAD + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - 2 * PAD)
const sy = (y: number) => H - PAD - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (H - 2 * PAD)

// f(x) = (x³ − 3x)/2 ;  f'(x) = (3x² − 3)/2
const f = (x: number) => (x * x * x - 3 * x) / 2
const df = (x: number) => (3 * x * x - 3) / 2

type Beat = 'tangent' | 'secant' | 'gradient'
const BEATS: Beat[] = ['tangent', 'secant', 'gradient']

function plot(fn: (x: number) => number): string {
  const pts: string[] = []
  for (let i = 0; i <= N; i++) {
    const x = X_MIN + (i / N) * (X_MAX - X_MIN)
    pts.push(`${i === 0 ? 'M' : 'L'}${fmt(sx(x), 1)},${fmt(sy(clamp(fn(x), Y_MIN - 4, Y_MAX + 4)), 1)}`)
  }
  return pts.join(' ')
}

export function DiffExplorer({ step, stepCount }: ExplorableProps) {
  const [x, setX] = useState(1.2)
  const [h, setH] = useState(1)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState(false)
  const beat = BEATS[clamp(step, 0, stepCount - 1)] ?? 'tangent'

  const fx = f(x)
  const m = df(x)
  const x2 = clamp(x + h, X_MIN, X_MAX)
  const secM = Math.abs(x2 - x) < 1e-6 ? m : (f(x2) - fx) / (x2 - x)

  const curve = useMemo(() => plot(f), [])
  const gradCurve = useMemo(() => plot(df), [])

  // tangent endpoints across the plane
  const tanLine = useMemo(() => {
    const y1 = fx + m * (X_MIN - x)
    const y2 = fx + m * (X_MAX - x)
    return { x1: sx(X_MIN), y1: sy(clamp(y1, Y_MIN - 50, Y_MAX + 50)), x2: sx(X_MAX), y2: sy(clamp(y2, Y_MIN - 50, Y_MAX + 50)) }
  }, [fx, m, x])

  const moveTo = useCallback((clientX: number) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const px = ((clientX - rect.left) / rect.width) * W
    const nx = X_MIN + ((px - PAD) / (W - 2 * PAD)) * (X_MAX - X_MIN)
    setX(clamp(fmt(nx, 2), X_MIN + 0.2, X_MAX - 0.2))
  }, [])

  const onDown = (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setDragging(true)
    moveTo(e.clientX)
  }
  const onMove = (e: React.PointerEvent) => {
    if (dragging) moveTo(e.clientX)
  }
  const onUp = (e: React.PointerEvent) => {
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    setDragging(false)
  }

  const showSecant = beat === 'secant'
  const showGrad = beat === 'gradient'

  return (
    <div className="qex diff" data-beat={beat}>
      <div className="qex-stagewrap">
        <svg
          ref={svgRef}
          className="qex-svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Cubic with tangent at x=${fmt(x)}, gradient ${fmt(m)}.`}
        >
          {[-2, 2].map((gx) => (
            <line key={`gx${gx}`} className="qex-grid" x1={sx(gx)} y1={sy(Y_MIN)} x2={sx(gx)} y2={sy(Y_MAX)} />
          ))}
          {[-8, -4, 4, 8].map((gy) => (
            <line key={`gy${gy}`} className="qex-grid" x1={sx(X_MIN)} y1={sy(gy)} x2={sx(X_MAX)} y2={sy(gy)} />
          ))}
          <line className="qex-axis" x1={sx(X_MIN)} y1={sy(0)} x2={sx(X_MAX)} y2={sy(0)} />
          <line className="qex-axis" x1={sx(0)} y1={sy(Y_MIN)} x2={sx(0)} y2={sy(Y_MAX)} />

          {/* gradient function f'(x) */}
          {showGrad ? <path className="diff-grad" d={gradCurve} fill="none" /> : null}

          {/* the curve f(x) */}
          <path className="qex-curve" d={curve} fill="none" />

          {/* tangent */}
          <line className={`diff-tangent${beat === 'tangent' ? ' hot' : ''}`} x1={tanLine.x1} y1={tanLine.y1} x2={tanLine.x2} y2={tanLine.y2} />

          {/* secant (limit definition) */}
          {showSecant ? (
            <>
              <line className="diff-secant" x1={sx(x)} y1={sy(fx)} x2={sx(x2)} y2={sy(f(x2))} />
              <g className="diff-pt2">
                <line className="diff-drop" x1={sx(x2)} y1={sy(0)} x2={sx(x2)} y2={sy(f(x2))} />
                <circle cx={sx(x2)} cy={sy(f(x2))} r={4.5} />
                <text className="diff-label mono" x={sx(x2) + 6} y={sy(f(x2)) - 6}>x+h</text>
              </g>
            </>
          ) : null}

          {/* draggable point on the curve */}
          <g
            className={`qex-vertex${dragging ? ' grab' : ''}`}
            transform={`translate(${sx(x)},${sy(fx)})`}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
          >
            <circle className="qex-vertex-halo" r={13} />
            <circle className="qex-vertex-dot" r={6} />
          </g>
        </svg>
        <p className="qex-draghint micro">drag the point along the curve · slide h to shrink the secant</p>
      </div>

      <div className="qex-panel">
        <div className="qex-eq">
          <span className="qex-eq-row"><span className="qex-eq-tag mono">CURVE</span> <InlineMath math={'f(x) = \\tfrac{1}{2}(x^3 - 3x)'} /></span>
          <span className="qex-eq-row"><span className="qex-eq-tag mono">DERIV</span> <InlineMath math={"f'(x) = \\tfrac{1}{2}(3x^2 - 3)"} /></span>
        </div>
        <dl className="qex-readout">
          <div><dt>x</dt><dd className="mono">{fmt(x)}</dd></div>
          <div><dt>f(x)</dt><dd className="mono">{fmt(fx)}</dd></div>
          <div className={beat !== 'secant' ? 'rd-hot' : ''}><dt>gradient f′(x)</dt><dd className="mono">{fmt(m, 3)}</dd></div>
          <div className={beat === 'secant' ? 'rd-hot' : ''}><dt>secant (h={fmt(h, 2)})</dt><dd className="mono">{fmt(secM, 3)}</dd></div>
        </dl>
        <div className="qex-controls">
          <label className="qex-slider">
            <span className="qex-slider-head">
              <span className="qex-slider-label mono">x</span>
              <span className="qex-slider-val mono">{fmt(x)}</span>
            </span>
            <input type="range" min={X_MIN + 0.2} max={X_MAX - 0.2} step={0.05} value={x} onChange={(e) => setX(Number(e.target.value))} aria-label="x position" />
          </label>
          <label className="qex-slider">
            <span className="qex-slider-head">
              <span className="qex-slider-label mono">h (secant gap)</span>
              <span className="qex-slider-val mono">{fmt(h, 2)}</span>
            </span>
            <input type="range" min={0.05} max={2} step={0.05} value={h} onChange={(e) => setH(Number(e.target.value))} aria-label="secant gap h" />
          </label>
          <p className="diff-note body-2">
            As <InlineMath math={'h \\to 0'} />, the secant gradient approaches the tangent gradient{' '}
            <InlineMath math={"f'(x)"} />.
          </p>
        </div>
      </div>
    </div>
  )
}
