'use client'

/**
 * Simple Harmonic Motion Explorer — set amplitude A and period T, then scrub
 * time to watch the mass oscillate while the displacement–time graph traces out.
 * Readouts for x, v, a and their maxima. Beats: displacement → velocity →
 * acceleration.
 */

import { useMemo, useState } from 'react'
import { InlineMath } from 'react-katex'
import type { ExplorableProps } from './registry'

const W = 520
const H = 300
const TRACK_X = 150
const TRACK_Y = 150
const PX_PER_UNIT = 18 // mass track scale (±5 units → ±90px)
const GX0 = 280
const GX1 = 505
const GY = 150
const GAMP = 80 // graph amplitude in px for A=5

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number, dp = 2) => {
  const r = Number(v.toFixed(dp))
  return Object.is(r, -0) ? 0 : r
}

type Beat = 'displacement' | 'velocity' | 'acceleration'
const BEATS: Beat[] = ['displacement', 'velocity', 'acceleration']

export function SHMExplorer({ step, stepCount }: ExplorableProps) {
  const [A, setA] = useState(4)
  const [T, setT] = useState(2)
  const [tFrac, setTFrac] = useState(0.15)
  const beat = BEATS[clamp(step, 0, stepCount - 1)] ?? 'displacement'

  const omega = (2 * Math.PI) / T
  const tEnd = 2 * T
  const t = tFrac * tEnd
  const x = A * Math.cos(omega * t)
  const v = -A * omega * Math.sin(omega * t)
  const a = -omega * omega * x
  const vMax = A * omega
  const aMax = A * omega * omega

  const px = (tt: number) => GX0 + (tt / tEnd) * (GX1 - GX0)
  const py = (d: number) => GY - (d / 5) * GAMP

  const trace = useMemo(() => {
    const pts: string[] = []
    const steps = 160
    for (let i = 0; i <= steps; i++) {
      const tt = (i / steps) * t
      pts.push(`${i === 0 ? 'M' : 'L'}${fmt(px(tt), 1)},${fmt(py(A * Math.cos(omega * tt)), 1)}`)
    }
    return pts.join(' ')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, A, omega, tEnd])

  const ghost = useMemo(() => {
    const pts: string[] = []
    const steps = 200
    for (let i = 0; i <= steps; i++) {
      const tt = (i / steps) * tEnd
      pts.push(`${i === 0 ? 'M' : 'L'}${fmt(px(tt), 1)},${fmt(py(A * Math.cos(omega * tt)), 1)}`)
    }
    return pts.join(' ')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [A, omega, tEnd])

  const massX = TRACK_X + x * PX_PER_UNIT

  return (
    <div className="qex shm" data-beat={beat}>
      <div className="qex-stagewrap">
        <svg className="qex-svg" viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`SHM amplitude ${fmt(A)}, period ${fmt(T)}s. x=${fmt(x)}.`}>
          {/* mass track */}
          <line className="qex-axis" x1={TRACK_X - 5 * PX_PER_UNIT} y1={TRACK_Y} x2={TRACK_X + 5 * PX_PER_UNIT} y2={TRACK_Y} />
          {/* equilibrium + amplitude markers */}
          <line className="shm-eq" x1={TRACK_X} y1={TRACK_Y - 30} x2={TRACK_X} y2={TRACK_Y + 30} />
          <line className="shm-amp" x1={TRACK_X - A * PX_PER_UNIT} y1={TRACK_Y - 18} x2={TRACK_X - A * PX_PER_UNIT} y2={TRACK_Y + 18} />
          <line className="shm-amp" x1={TRACK_X + A * PX_PER_UNIT} y1={TRACK_Y - 18} x2={TRACK_X + A * PX_PER_UNIT} y2={TRACK_Y + 18} />
          {/* velocity vector on the mass */}
          {beat === 'velocity' ? (
            <line className="shm-vec vel" x1={massX} y1={TRACK_Y} x2={massX + v * PX_PER_UNIT * 0.5} y2={TRACK_Y} markerEnd="url(#shmv)" />
          ) : null}
          {beat === 'acceleration' ? (
            <line className="shm-vec acc" x1={massX} y1={TRACK_Y} x2={massX + a * PX_PER_UNIT * 0.18} y2={TRACK_Y} markerEnd="url(#shma)" />
          ) : null}
          {/* mass */}
          <circle className="shm-mass" cx={massX} cy={TRACK_Y} r={12} />
          <text className="shm-track-label mono" x={TRACK_X} y={TRACK_Y + 48} textAnchor="middle">displacement x</text>

          {/* displacement–time graph */}
          <line className="qex-axis" x1={GX0} y1={GY} x2={GX1} y2={GY} />
          <path className="trig-ghost" d={ghost} fill="none" />
          <path className="qex-curve" d={trace} fill="none" />
          <circle className="shm-head" cx={px(t)} cy={py(x)} r={5} />
          <text className="shm-track-label mono" x={(GX0 + GX1) / 2} y={GY + 60} textAnchor="middle">x against t</text>

          <defs>
            <marker id="shmv" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" className="shm-arrow vel" /></marker>
            <marker id="shma" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" className="shm-arrow acc" /></marker>
          </defs>
        </svg>
        <p className="qex-draghint micro">set A and T, then scrub time — watch the mass and the graph</p>
      </div>

      <div className="qex-panel">
        <div className="qex-eq">
          <span className="qex-eq-row"><span className="qex-eq-tag mono">SHM</span> <InlineMath math={`x = ${fmt(A)}\\cos(${fmt(omega)}t)`} /></span>
        </div>
        <dl className="qex-readout">
          <div className={beat === 'displacement' ? 'rd-hot' : ''}><dt>x (displacement)</dt><dd className="mono">{fmt(x)}</dd></div>
          <div className={beat === 'velocity' ? 'rd-hot' : ''}><dt>v (velocity)</dt><dd className="mono">{fmt(v)}</dd></div>
          <div className={beat === 'acceleration' ? 'rd-hot' : ''}><dt>a (acceleration)</dt><dd className="mono">{fmt(a)}</dd></div>
          <div><dt>ω</dt><dd className="mono">{fmt(omega)} rad/s</dd></div>
          <div><dt>v max = Aω</dt><dd className="mono">{fmt(vMax)}</dd></div>
          <div><dt>a max = Aω²</dt><dd className="mono">{fmt(aMax)}</dd></div>
        </dl>
        <div className="qex-controls">
          <Slider label="A (amplitude)" value={A} min={1} max={5} step={0.25} onChange={setA} />
          <Slider label="T (period, s)" value={T} min={1} max={4} step={0.1} onChange={setT} />
          <Slider label="time" value={tFrac} min={0} max={1} step={0.005} onChange={setTFrac} />
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
