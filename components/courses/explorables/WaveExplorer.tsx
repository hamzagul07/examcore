'use client'

/**
 * Progressive Wave Explorer — set amplitude, wavelength and frequency, then
 * scrub time to watch the wave travel. A marked particle oscillates up and down
 * in place. Wave speed v = fλ, period T = 1/f update live. Beats: shape →
 * speed (v=fλ) → period.
 */

import { useMemo, useState } from 'react'
import { InlineMath } from 'react-katex'
import type { ExplorableProps } from './registry'

const W = 520
const H = 250
const PAD_X = 30
const MIDY = 125
const X_MAX = 4 // metres
const Y_PX = 80 // px per unit amplitude region (A up to ~1.4)
const PARTICLE_X = 1.0 // where the tracked particle sits

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number, dp = 2) => {
  const r = Number(v.toFixed(dp))
  return Object.is(r, -0) ? 0 : r
}
const sx = (x: number) => PAD_X + (x / X_MAX) * (W - 2 * PAD_X)
const sy = (y: number) => MIDY - y * Y_PX

type Beat = 'shape' | 'speed' | 'period'
const BEATS: Beat[] = ['shape', 'speed', 'period']

export function WaveExplorer({ step, stepCount }: ExplorableProps) {
  const [A, setA] = useState(1)
  const [lambda, setLambda] = useState(1.5)
  const [f, setF] = useState(1)
  const [tFrac, setTFrac] = useState(0)
  const beat = BEATS[clamp(step, 0, stepCount - 1)] ?? 'shape'

  const T = 1 / f
  const v = f * lambda
  const t = tFrac * (2 * T)
  const yAt = (x: number) => A * Math.sin(2 * Math.PI * (x / lambda - f * t))

  const wave = useMemo(() => {
    const pts: string[] = []
    const steps = 200
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * X_MAX
      pts.push(`${i === 0 ? 'M' : 'L'}${fmt(sx(x), 1)},${fmt(sy(yAt(x)), 1)}`)
    }
    return pts.join(' ')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [A, lambda, f, t])

  const py = yAt(PARTICLE_X)
  // wavelength bracket between two crests near the left
  const crest1 = sx(0.0)
  const crest2 = sx(lambda)

  return (
    <div className="qex wave" data-beat={beat}>
      <div className="qex-stagewrap">
        <svg className="qex-svg" viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Wave amplitude ${fmt(A)}, wavelength ${fmt(lambda)} m, frequency ${fmt(f)} Hz, speed ${fmt(v)} m/s.`}>
          <line className="qex-axis" x1={sx(0)} y1={MIDY} x2={sx(X_MAX)} y2={MIDY} />
          {/* wavelength marker */}
          {beat !== 'period' ? (
            <g className={`wave-lambda${beat === 'speed' ? ' hot' : ''}`}>
              <line x1={crest1} y1={sy(A) - 12} x2={crest2} y2={sy(A) - 12} markerStart="url(#wl)" markerEnd="url(#wl)" />
              <text className="wave-label mono" x={(crest1 + crest2) / 2} y={sy(A) - 16} textAnchor="middle">λ</text>
            </g>
          ) : null}
          {/* the wave */}
          <path className="qex-curve" d={wave} fill="none" />
          {/* tracked particle */}
          <line className="wave-particle-line" x1={sx(PARTICLE_X)} y1={MIDY} x2={sx(PARTICLE_X)} y2={sy(py)} />
          <circle className="wave-particle" cx={sx(PARTICLE_X)} cy={sy(py)} r={6} />
          <defs>
            <marker id="wl" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M8,0 L0,4 L8,8" className="wave-tick" fill="none" /></marker>
          </defs>
        </svg>
        <p className="qex-draghint micro">scrub time to send the wave travelling · the dot oscillates in place</p>
      </div>

      <div className="qex-panel">
        <div className="qex-eq">
          <span className="qex-eq-row"><span className="qex-eq-tag mono">WAVE</span> <InlineMath math={`y = ${fmt(A)}\\sin\\!\\big(2\\pi(\\tfrac{x}{${fmt(lambda)}} - ${fmt(f)}t)\\big)`} /></span>
        </div>
        <div className={`circ-formula${beat === 'speed' ? ' hot' : ''}`}>
          <InlineMath math={`v = f\\lambda = ${fmt(f)} \\times ${fmt(lambda)} = ${fmt(v)}\\text{ m/s}`} />
        </div>
        <dl className="qex-readout">
          <div className={beat === 'speed' ? 'rd-hot' : ''}><dt>wave speed v</dt><dd className="mono">{fmt(v)} m/s</dd></div>
          <div className={beat === 'period' ? 'rd-hot' : ''}><dt>period T = 1/f</dt><dd className="mono">{fmt(T, 2)} s</dd></div>
          <div><dt>frequency f</dt><dd className="mono">{fmt(f)} Hz</dd></div>
          <div><dt>wavelength λ</dt><dd className="mono">{fmt(lambda)} m</dd></div>
        </dl>
        <div className="qex-controls">
          <Slider label="A (amplitude)" value={A} min={0.3} max={1.4} step={0.1} onChange={setA} />
          <Slider label="λ (wavelength, m)" value={lambda} min={0.5} max={3} step={0.1} onChange={setLambda} />
          <Slider label="f (frequency, Hz)" value={f} min={0.5} max={3} step={0.1} onChange={setF} />
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
