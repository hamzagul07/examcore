'use client'

/**
 * Coordinate Geometry Explorer — drag two points and read the line through them:
 * gradient, midpoint, length, and equation update live. Beats: the line →
 * gradient → midpoint & length.
 */

import { useCallback, useRef, useState } from 'react'
import { InlineMath } from 'react-katex'
import type { ExplorableProps } from './registry'

const W = 400
const H = 400
const PAD = 28
const MIN = -8
const MAX = 8

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number, dp = 2) => {
  const r = Number(v.toFixed(dp))
  return Object.is(r, -0) ? 0 : r
}
const sx = (x: number) => PAD + ((x - MIN) / (MAX - MIN)) * (W - 2 * PAD)
const sy = (y: number) => H - PAD - ((y - MIN) / (MAX - MIN)) * (H - 2 * PAD)
const toX = (px: number) => MIN + ((px - PAD) / (W - 2 * PAD)) * (MAX - MIN)
const toY = (py: number) => MIN + ((H - PAD - py) / (H - 2 * PAD)) * (MAX - MIN)

type Beat = 'line' | 'gradient' | 'midpoint'
const BEATS: Beat[] = ['line', 'gradient', 'midpoint']

export function CoordGeometryExplorer({ step, stepCount }: ExplorableProps) {
  const [a, setA] = useState({ x: -4, y: -2 })
  const [b, setB] = useState({ x: 3, y: 4 })
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<null | 'a' | 'b'>(null)
  const beat = BEATS[clamp(step, 0, stepCount - 1)] ?? 'line'

  const dx = b.x - a.x
  const dy = b.y - a.y
  const vertical = Math.abs(dx) < 1e-6
  const m = vertical ? Infinity : dy / dx
  const c = vertical ? NaN : a.y - m * a.x
  const dist = Math.hypot(dx, dy)
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }

  // line endpoints across the plane
  const lineEnds = vertical
    ? { x1: sx(a.x), y1: sy(MIN), x2: sx(a.x), y2: sy(MAX) }
    : {
        x1: sx(MIN),
        y1: sy(clamp(m * MIN + c, MIN - 40, MAX + 40)),
        x2: sx(MAX),
        y2: sy(clamp(m * MAX + c, MIN - 40, MAX + 40)),
      }

  const moveTo = useCallback((clientX: number, clientY: number, which: 'a' | 'b') => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = Math.round(clamp(toX(((clientX - rect.left) / rect.width) * W), MIN, MAX))
    const y = Math.round(clamp(toY(((clientY - rect.top) / rect.height) * H), MIN, MAX))
    const next = { x, y }
    if (which === 'a') setA(next)
    else setB(next)
  }, [])

  const onDown = (which: 'a' | 'b') => (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setDrag(which)
    moveTo(e.clientX, e.clientY, which)
  }
  const onMove = (e: React.PointerEvent) => {
    if (drag) moveTo(e.clientX, e.clientY, drag)
  }
  const onUp = (e: React.PointerEvent) => {
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    setDrag(null)
  }

  const renderPoint = (which: 'a' | 'b', p: { x: number; y: number }, label: string) => (
    <g
      key={which}
      className={`qex-vertex${drag === which ? ' grab' : ''}`}
      transform={`translate(${sx(p.x)},${sy(p.y)})`}
      onPointerDown={onDown(which)}
      onPointerMove={onMove}
      onPointerUp={onUp}
      style={{ cursor: drag === which ? 'grabbing' : 'grab' }}
    >
      <circle className="qex-vertex-halo" r={13} />
      <circle className="qex-vertex-dot" r={6} />
      <text className="coord-label mono" x={11} y={-9}>{label}({p.x}, {p.y})</text>
    </g>
  )

  const eq = vertical
    ? `x = ${fmt(a.x)}`
    : `y = ${m === 1 ? '' : m === -1 ? '-' : fmt(m)}x ${c < 0 ? '-' : '+'} ${Math.abs(fmt(c))}`

  return (
    <div className="qex coord" data-beat={beat}>
      <div className="qex-stagewrap">
        <svg ref={svgRef} className="qex-svg" viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Line through A(${a.x},${a.y}) and B(${b.x},${b.y}). Gradient ${vertical ? 'undefined' : fmt(m)}.`}>
          {[-6, -4, -2, 2, 4, 6].map((g) => (
            <g key={g}>
              <line className="qex-grid" x1={sx(g)} y1={sy(MIN)} x2={sx(g)} y2={sy(MAX)} />
              <line className="qex-grid" x1={sx(MIN)} y1={sy(g)} x2={sx(MAX)} y2={sy(g)} />
            </g>
          ))}
          <line className="qex-axis" x1={sx(MIN)} y1={sy(0)} x2={sx(MAX)} y2={sy(0)} />
          <line className="qex-axis" x1={sx(0)} y1={sy(MIN)} x2={sx(0)} y2={sy(MAX)} />
          {/* the line */}
          <line className="coord-line" x1={lineEnds.x1} y1={lineEnds.y1} x2={lineEnds.x2} y2={lineEnds.y2} />
          {/* AB segment */}
          <line className={`coord-seg${beat === 'gradient' ? ' hot' : ''}`} x1={sx(a.x)} y1={sy(a.y)} x2={sx(b.x)} y2={sy(b.y)} />
          {/* rise/run when gradient beat */}
          {beat === 'gradient' && !vertical ? (
            <>
              <line className="coord-run" x1={sx(a.x)} y1={sy(a.y)} x2={sx(b.x)} y2={sy(a.y)} />
              <line className="coord-rise" x1={sx(b.x)} y1={sy(a.y)} x2={sx(b.x)} y2={sy(b.y)} />
            </>
          ) : null}
          {/* midpoint */}
          {beat === 'midpoint' ? <circle className="coord-mid" cx={sx(mid.x)} cy={sy(mid.y)} r={5} /> : null}
          {renderPoint('a', a, 'A')}
          {renderPoint('b', b, 'B')}
        </svg>
        <p className="qex-draghint micro">drag points A and B around the grid</p>
      </div>

      <div className="qex-panel">
        <div className="qex-eq">
          <span className="qex-eq-row"><span className="qex-eq-tag mono">LINE</span> <InlineMath math={eq} /></span>
        </div>
        <dl className="qex-readout">
          <div className={beat === 'gradient' ? 'rd-hot' : ''}><dt>gradient m</dt><dd className="mono">{vertical ? 'undefined' : fmt(m, 3)}</dd></div>
          <div className={beat === 'midpoint' ? 'rd-hot' : ''}><dt>midpoint</dt><dd className="mono">({fmt(mid.x)}, {fmt(mid.y)})</dd></div>
          <div className={beat === 'midpoint' ? 'rd-hot' : ''}><dt>length |AB|</dt><dd className="mono">{fmt(dist, 3)}</dd></div>
          <div><dt>Δy / Δx</dt><dd className="mono">{fmt(dy)} / {fmt(dx)}</dd></div>
        </dl>
        <p className="diff-note body-2">Gradient is rise over run; the midpoint averages the coordinates; length is Pythagoras on Δx and Δy.</p>
      </div>
    </div>
  )
}
