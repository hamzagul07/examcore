'use client'

/**
 * Projectile Motion Explorer — set launch speed u and angle θ, then scrub time
 * to fly the projectile along its parabola with a live velocity vector. Range,
 * max height and time of flight update from the suvat equations. Beats:
 * trajectory → max height → range/time.
 */

import { useMemo, useState } from 'react'
import type { ExplorableProps } from './registry'

const W = 500
const H = 300
const PAD_L = 34
const PAD_R = 16
const PAD_T = 16
const PAD_B = 30
const X_MAX = 100 // metres
const Y_MAX = 55
const G = 9.81

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number, dp = 1) => {
  const r = Number(v.toFixed(dp))
  return Object.is(r, -0) ? 0 : r
}
const sx = (x: number) => PAD_L + (x / X_MAX) * (W - PAD_L - PAD_R)
const sy = (y: number) => H - PAD_B - (y / Y_MAX) * (H - PAD_T - PAD_B)

type Beat = 'flight' | 'peak' | 'range'
const BEATS: Beat[] = ['flight', 'peak', 'range']

export function ProjectileExplorer({ step, stepCount }: ExplorableProps) {
  const [u, setU] = useState(25)
  const [angle, setAngle] = useState(45)
  const [tFrac, setTFrac] = useState(0.45) // fraction of flight time
  const beat = BEATS[clamp(step, 0, stepCount - 1)] ?? 'flight'

  const rad = (angle * Math.PI) / 180
  const ux = u * Math.cos(rad)
  const uy = u * Math.sin(rad)
  const T = (2 * uy) / G
  const range = ux * T
  const maxH = (uy * uy) / (2 * G)
  const t = tFrac * T
  const x = ux * t
  const y = Math.max(0, uy * t - 0.5 * G * t * t)
  const vx = ux
  const vy = uy - G * t
  const speed = Math.hypot(vx, vy)

  const path = useMemo(() => {
    const pts: string[] = []
    const steps = 80
    for (let i = 0; i <= steps; i++) {
      const tt = (i / steps) * T
      const xx = ux * tt
      const yy = uy * tt - 0.5 * G * tt * tt
      pts.push(`${i === 0 ? 'M' : 'L'}${fmt(sx(xx), 1)},${fmt(sy(Math.max(0, yy)), 1)}`)
    }
    return pts.join(' ')
  }, [ux, uy, T])

  // velocity vector (scaled)
  const vScale = 1.6
  const vx2 = sx(x) + vx * vScale
  const vy2 = sy(y) - vy * vScale

  return (
    <div className="qex projectile" data-beat={beat}>
      <div className="qex-stagewrap">
        <svg className="qex-svg" viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Projectile u=${fmt(u)} m/s at ${fmt(angle)}°. Range ${fmt(range)} m, max height ${fmt(maxH)} m.`}>
          {/* ground + axis */}
          <line className="qex-axis" x1={sx(0)} y1={sy(0)} x2={sx(X_MAX)} y2={sy(0)} />
          <line className="qex-axis" x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(Y_MAX)} />
          {/* max-height guide */}
          <line className={`proj-guide${beat === 'peak' ? ' hot' : ''}`} x1={sx(0)} y1={sy(maxH)} x2={sx(range / 2)} y2={sy(maxH)} />
          {/* range guide */}
          <line className={`proj-guide${beat === 'range' ? ' hot' : ''}`} x1={sx(range)} y1={sy(0)} x2={sx(range)} y2={sy(0) + 6} />
          {/* trajectory */}
          <path className="qex-curve" d={path} fill="none" />
          {/* velocity vector */}
          <line className="proj-vector" x1={sx(x)} y1={sy(y)} x2={vx2} y2={vy2} markerEnd="url(#projarrow)" />
          {/* ball */}
          <circle className="proj-ball" cx={sx(x)} cy={sy(y)} r={6} />
          <defs>
            <marker id="projarrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" className="proj-arrowhead" />
            </marker>
          </defs>
        </svg>
        <p className="qex-draghint micro">set u and θ, then scrub time to fly the projectile</p>
      </div>

      <div className="qex-panel">
        <div className="qex-eq">
          <span className="qex-eq-row"><span className="qex-eq-tag mono">LAUNCH</span> u = {fmt(u)} m/s, θ = {fmt(angle)}°</span>
        </div>
        <dl className="qex-readout">
          <div className={beat === 'range' ? 'rd-hot' : ''}><dt>range</dt><dd className="mono">{fmt(range)} m</dd></div>
          <div className={beat === 'peak' ? 'rd-hot' : ''}><dt>max height</dt><dd className="mono">{fmt(maxH)} m</dd></div>
          <div className={beat === 'range' ? 'rd-hot' : ''}><dt>time of flight</dt><dd className="mono">{fmt(T, 2)} s</dd></div>
          <div><dt>speed now</dt><dd className="mono">{fmt(speed)} m/s</dd></div>
          <div><dt>position</dt><dd className="mono">({fmt(x)}, {fmt(y)})</dd></div>
          <div><dt>vᵧ now</dt><dd className="mono">{fmt(vy)} m/s</dd></div>
        </dl>
        <div className="qex-controls">
          <Slider label="u (m/s)" value={u} min={5} max={32} step={0.5} onChange={setU} />
          <Slider label="θ (°)" value={angle} min={10} max={80} step={1} onChange={setAngle} />
          <Slider label="time" value={tFrac} min={0} max={1} step={0.01} onChange={setTFrac} />
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
        <span className="qex-slider-val mono">{fmt(value, 2)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </label>
  )
}
