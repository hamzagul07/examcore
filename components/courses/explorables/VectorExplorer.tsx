'use client'

/**
 * Vector Addition Explorer — drag the tips of two vectors from the origin and
 * see the resultant a + b with the parallelogram. Magnitudes and directions
 * update live. Beats: the two vectors → resultant → components.
 */

import { useCallback, useRef, useState } from 'react'
import { InlineMath } from 'react-katex'
import type { ExplorableProps } from './registry'

const W = 400
const H = 400
const PAD = 28
const MIN = -7
const MAX = 7

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number, dp = 2) => {
  const r = Number(v.toFixed(dp))
  return Object.is(r, -0) ? 0 : r
}
const sx = (x: number) => PAD + ((x - MIN) / (MAX - MIN)) * (W - 2 * PAD)
const sy = (y: number) => H - PAD - ((y - MIN) / (MAX - MIN)) * (H - 2 * PAD)
const toX = (px: number) => MIN + ((px - PAD) / (W - 2 * PAD)) * (MAX - MIN)
const toY = (py: number) => MIN + ((H - PAD - py) / (H - 2 * PAD)) * (MAX - MIN)
const ang = (x: number, y: number) => {
  let d = (Math.atan2(y, x) * 180) / Math.PI
  if (d < 0) d += 360
  return d
}

type Beat = 'vectors' | 'resultant' | 'components'
const BEATS: Beat[] = ['vectors', 'resultant', 'components']

export function VectorExplorer({ step, stepCount }: ExplorableProps) {
  const [a, setA] = useState({ x: 4, y: 1 })
  const [b, setB] = useState({ x: 1, y: 4 })
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<null | 'a' | 'b'>(null)
  const beat = BEATS[clamp(step, 0, stepCount - 1)] ?? 'vectors'

  const r = { x: a.x + b.x, y: a.y + b.y }
  const magA = Math.hypot(a.x, a.y)
  const magB = Math.hypot(b.x, b.y)
  const magR = Math.hypot(r.x, r.y)

  const moveTo = useCallback((cx: number, cy: number, which: 'a' | 'b') => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = Math.round(clamp(toX(((cx - rect.left) / rect.width) * W), MIN, MAX))
    const y = Math.round(clamp(toY(((cy - rect.top) / rect.height) * H), MIN, MAX))
    ;(which === 'a' ? setA : setB)({ x, y })
  }, [])

  const onDown = (which: 'a' | 'b') => (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setDrag(which)
    moveTo(e.clientX, e.clientY, which)
  }
  const onMove = (e: React.PointerEvent) => { if (drag) moveTo(e.clientX, e.clientY, drag) }
  const onUp = (e: React.PointerEvent) => { ;(e.target as Element).releasePointerCapture?.(e.pointerId); setDrag(null) }

  const arrow = (from: { x: number; y: number }, to: { x: number; y: number }, cls: string, marker: string) => (
    <line className={cls} x1={sx(from.x)} y1={sy(from.y)} x2={sx(to.x)} y2={sy(to.y)} markerEnd={`url(#${marker})`} />
  )
  const tip = (which: 'a' | 'b', p: { x: number; y: number }) => (
    <g key={which} className={`qex-vertex${drag === which ? ' grab' : ''}`} transform={`translate(${sx(p.x)},${sy(p.y)})`}
      onPointerDown={onDown(which)} onPointerMove={onMove} onPointerUp={onUp} style={{ cursor: drag === which ? 'grabbing' : 'grab' }}>
      <circle className="qex-vertex-halo" r={12} />
      <circle className="qex-vertex-dot" r={5.5} />
      <text className="coord-label mono" x={10} y={-8}>{which}</text>
    </g>
  )

  return (
    <div className="qex vectors" data-beat={beat}>
      <div className="qex-stagewrap">
        <svg ref={svgRef} className="qex-svg" viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Vector a (${a.x},${a.y}) plus b (${b.x},${b.y}) = (${r.x},${r.y}).`}>
          {[-6, -4, -2, 2, 4, 6].map((g) => (
            <g key={g}>
              <line className="qex-grid" x1={sx(g)} y1={sy(MIN)} x2={sx(g)} y2={sy(MAX)} />
              <line className="qex-grid" x1={sx(MIN)} y1={sy(g)} x2={sx(MAX)} y2={sy(g)} />
            </g>
          ))}
          <line className="qex-axis" x1={sx(MIN)} y1={sy(0)} x2={sx(MAX)} y2={sy(0)} />
          <line className="qex-axis" x1={sx(0)} y1={sy(MIN)} x2={sx(0)} y2={sy(MAX)} />
          {/* parallelogram guides */}
          {beat !== 'vectors' ? (
            <>
              <line className="vec-guide" x1={sx(a.x)} y1={sy(a.y)} x2={sx(r.x)} y2={sy(r.y)} />
              <line className="vec-guide" x1={sx(b.x)} y1={sy(b.y)} x2={sx(r.x)} y2={sy(r.y)} />
            </>
          ) : null}
          {/* components of resultant */}
          {beat === 'components' ? (
            <>
              <line className="coord-run" x1={sx(0)} y1={sy(0)} x2={sx(r.x)} y2={sy(0)} />
              <line className="coord-rise" x1={sx(r.x)} y1={sy(0)} x2={sx(r.x)} y2={sy(r.y)} />
            </>
          ) : null}
          {/* vectors */}
          {arrow({ x: 0, y: 0 }, a, 'vec-a', 'va')}
          {arrow({ x: 0, y: 0 }, b, 'vec-b', 'vb')}
          {beat !== 'vectors' ? arrow({ x: 0, y: 0 }, r, 'vec-r', 'vr') : null}
          {tip('a', a)}
          {tip('b', b)}
          <defs>
            <marker id="va" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" className="vec-a-head" /></marker>
            <marker id="vb" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" className="vec-b-head" /></marker>
            <marker id="vr" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" className="vec-r-head" /></marker>
          </defs>
        </svg>
        <p className="qex-draghint micro">drag the tips of a and b · the resultant a + b appears</p>
      </div>

      <div className="qex-panel">
        <div className="qex-eq">
          <span className="qex-eq-row"><span className="qex-eq-tag mono">SUM</span> <InlineMath math={`\\mathbf{a}+\\mathbf{b} = (${fmt(r.x,0)},\\, ${fmt(r.y,0)})`} /></span>
        </div>
        <dl className="qex-readout">
          <div><dt>a</dt><dd className="mono">({a.x}, {a.y}) · |a|={fmt(magA)}</dd></div>
          <div><dt>b</dt><dd className="mono">({b.x}, {b.y}) · |b|={fmt(magB)}</dd></div>
          <div className={beat === 'resultant' ? 'rd-hot' : ''}><dt>|a + b|</dt><dd className="mono">{fmt(magR, 3)}</dd></div>
          <div className={beat === 'components' ? 'rd-hot' : ''}><dt>direction</dt><dd className="mono">{fmt(ang(r.x, r.y), 1)}°</dd></div>
        </dl>
        <p className="diff-note body-2">Add vectors component-wise: the resultant runs from the tail of a to the tip of b (the parallelogram diagonal). Its magnitude is √(rₓ² + rᵧ²).</p>
      </div>
    </div>
  )
}
