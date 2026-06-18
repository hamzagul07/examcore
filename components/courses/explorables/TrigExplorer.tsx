'use client'

/**
 * Trigonometry Explorer — the unit circle linked to the sine/cosine wave.
 * Drag the point around the circle (or use the angle slider) and watch the
 * sin/cos projections and the wave trace out together. Guided beats highlight
 * sine, then cosine, then tangent.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { InlineMath } from 'react-katex'
import type { ExplorableProps } from './registry'

const W = 540
const H = 320
const CX = 130 // circle centre x
const CY = 160 // circle centre y
const R = 96 // circle radius
const WAVE_X0 = 250
const WAVE_X1 = 520
const TURNS = 2 // show up to two full cycles (0–720°)

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number, dp = 2) => {
  const r = Number(v.toFixed(dp))
  return Object.is(r, -0) ? 0 : r
}
const DEG = Math.PI / 180

type Beat = 'sine' | 'cosine' | 'tangent'
const BEATS: Beat[] = ['sine', 'cosine', 'tangent']

export function TrigExplorer({ step, stepCount }: ExplorableProps) {
  const [deg, setDeg] = useState(45)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState(false)
  const beat = BEATS[clamp(step, 0, stepCount - 1)] ?? 'sine'

  const rad = deg * DEG
  const sin = Math.sin(rad)
  const cos = Math.cos(rad)
  const tan = Math.tan(rad)
  const px = CX + R * cos
  const py = CY - R * sin

  // angle a (radians) → wave x
  const waveX = (a: number) => WAVE_X0 + (a / (TURNS * 2 * Math.PI)) * (WAVE_X1 - WAVE_X0)
  const waveY = (value: number) => CY - value * R

  const tracePath = useMemo(() => {
    const fn = beat === 'cosine' ? Math.cos : Math.sin
    const pts: string[] = []
    const steps = 160
    const maxA = rad
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * maxA
      pts.push(`${i === 0 ? 'M' : 'L'}${fmt(waveX(a), 1)},${fmt(waveY(fn(a)), 1)}`)
    }
    return pts.join(' ')
  }, [rad, beat])

  const ghostPath = useMemo(() => {
    const fn = beat === 'cosine' ? Math.cos : Math.sin
    const pts: string[] = []
    const steps = 200
    const maxA = TURNS * 2 * Math.PI
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * maxA
      pts.push(`${i === 0 ? 'M' : 'L'}${fmt(waveX(a), 1)},${fmt(waveY(fn(a)), 1)}`)
    }
    return pts.join(' ')
  }, [beat])

  const moveTo = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * W - CX
    const y = -(((clientY - rect.top) / rect.height) * H - CY)
    let a = Math.atan2(y, x) / DEG
    if (a < 0) a += 360
    setDeg(Math.round(a))
  }, [])

  const onDown = (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setDragging(true)
    moveTo(e.clientX, e.clientY)
  }
  const onMove = (e: React.PointerEvent) => {
    if (dragging) moveTo(e.clientX, e.clientY)
  }
  const onUp = (e: React.PointerEvent) => {
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    setDragging(false)
  }

  const waveVal = beat === 'cosine' ? cos : sin

  return (
    <div className="qex trig" data-beat={beat}>
      <div className="qex-stagewrap">
        <svg
          ref={svgRef}
          className="qex-svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Unit circle at ${deg} degrees. sin ${fmt(sin)}, cos ${fmt(cos)}.`}
        >
          {/* axes for circle */}
          <line className="qex-grid" x1={CX - R - 14} y1={CY} x2={CX + R + 14} y2={CY} />
          <line className="qex-grid" x1={CX} y1={CY - R - 14} x2={CX} y2={CY + R + 14} />
          {/* unit circle */}
          <circle className="trig-circle" cx={CX} cy={CY} r={R} fill="none" />
          {/* cos projection (horizontal) */}
          <line className={`trig-cos${beat === 'cosine' ? ' hot' : ''}`} x1={CX} y1={py} x2={px} y2={py} />
          {/* sin projection (vertical) */}
          <line className={`trig-sin${beat === 'sine' ? ' hot' : ''}`} x1={px} y1={CY} x2={px} y2={py} />
          {/* radius */}
          <line className="trig-radius" x1={CX} y1={CY} x2={px} y2={py} />
          {/* draggable angle point */}
          <g
            className={`qex-vertex${dragging ? ' grab' : ''}`}
            transform={`translate(${px},${py})`}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
          >
            <circle className="qex-vertex-halo" r={13} />
            <circle className="qex-vertex-dot" r={6} />
          </g>

          {/* wave: baseline + ghost + trace */}
          <line className="qex-axis" x1={WAVE_X0} y1={CY} x2={WAVE_X1} y2={CY} />
          <path className="trig-ghost" d={ghostPath} fill="none" />
          <path className="qex-curve" d={tracePath} fill="none" />
          {/* connector from circle point to wave head */}
          <line className="trig-connector" x1={px} y1={py} x2={waveX(rad)} y2={waveY(waveVal)} />
          <circle className="trig-wavehead" cx={waveX(rad)} cy={waveY(waveVal)} r={5} />
        </svg>
        <p className="qex-draghint micro">drag the point around the circle · or use the slider</p>
      </div>

      <div className="qex-panel">
        <div className="qex-eq">
          <span className="qex-eq-row"><span className="qex-eq-tag mono">ANGLE</span> {deg}° = <InlineMath math={`${fmt(rad)}\\text{ rad}`} /></span>
        </div>
        <dl className="qex-readout">
          <div className={beat === 'sine' ? 'rd-hot' : ''}><dt>sin θ</dt><dd className="mono">{fmt(sin, 3)}</dd></div>
          <div className={beat === 'cosine' ? 'rd-hot' : ''}><dt>cos θ</dt><dd className="mono">{fmt(cos, 3)}</dd></div>
          <div className={beat === 'tangent' ? 'rd-hot' : ''}>
            <dt>tan θ</dt>
            <dd className="mono">{Math.abs(cos) < 1e-6 ? 'undefined' : fmt(tan, 3)}</dd>
          </div>
          <div><dt>quadrant</dt><dd>{quadrant(deg)}</dd></div>
        </dl>
        <div className="qex-controls">
          <label className="qex-slider">
            <span className="qex-slider-head">
              <span className="qex-slider-label mono">θ</span>
              <span className="qex-slider-val mono">{deg}°</span>
            </span>
            <input
              type="range"
              min={0}
              max={720}
              step={1}
              value={deg}
              onChange={(e) => setDeg(Number(e.target.value))}
              aria-label="angle in degrees"
            />
          </label>
          <div className="trig-presets">
            {[0, 30, 45, 60, 90, 180, 270].map((d) => (
              <button key={d} type="button" className="trig-preset" onClick={() => setDeg(d)}>
                {d}°
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function quadrant(deg: number): string {
  const d = ((deg % 360) + 360) % 360
  if (d === 0 || d === 90 || d === 180 || d === 270) return 'axis'
  if (d < 90) return 'I'
  if (d < 180) return 'II'
  if (d < 270) return 'III'
  return 'IV'
}
