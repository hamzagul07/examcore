'use client'

/**
 * Maxwell–Boltzmann Explorer — the distribution of molecular energies. Raise the
 * temperature to flatten and shift the curve right, and move the activation
 * energy Eₐ to see what fraction of molecules can react (the shaded tail). Beats:
 * the distribution → temperature → activation energy.
 */

import { useMemo, useState } from 'react'
import type { ExplorableProps } from './registry'

const W = 500
const H = 320
const PAD_L = 30
const PAD_R = 16
const PAD_T = 18
const PAD_B = 34
const E_MAX = 20
const N = 200

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number, dp = 0) => {
  const r = Number(v.toFixed(dp))
  return Object.is(r, -0) ? 0 : r
}
const sx = (e: number) => PAD_L + (e / E_MAX) * (W - PAD_L - PAD_R)

type Beat = 'distribution' | 'temperature' | 'activation'
const BEATS: Beat[] = ['distribution', 'temperature', 'activation']

export function MaxwellBoltzmannExplorer({ step, stepCount }: ExplorableProps) {
  const [temp, setTemp] = useState(500)
  const [ea, setEa] = useState(9)
  const beat = BEATS[clamp(step, 0, stepCount - 1)] ?? 'distribution'

  // f(E) ∝ √E · exp(−E/scale), scale ∝ T (arbitrary units)
  const dist = (E: number, T: number) => Math.sqrt(Math.max(0, E)) * Math.exp(-E / (0.018 * T))

  const { peak, fracMain, fracCold } = useMemo(() => {
    let peak = 0
    let areaAll = 0
    let areaPast = 0
    let areaColdAll = 0
    let areaColdPast = 0
    const dE = E_MAX / N
    for (let i = 0; i <= N; i++) {
      const E = i * dE
      const y = dist(E, temp)
      if (y > peak) peak = y
      areaAll += y * dE
      if (E >= ea) areaPast += y * dE
      const yc = dist(E, temp - 200)
      areaColdAll += yc * dE
      if (E >= ea) areaColdPast += yc * dE
    }
    return {
      peak,
      fracMain: areaAll ? areaPast / areaAll : 0,
      fracCold: areaColdAll ? areaColdPast / areaColdAll : 0,
    }
  }, [temp, ea])

  const yScaleMax = Math.max(peak, dist(0.5 * 0.018 * (temp - 200), temp - 200)) * 1.1
  const sy = (y: number) => H - PAD_B - (y / yScaleMax) * (H - PAD_T - PAD_B)

  const path = (T: number) => {
    const pts: string[] = []
    for (let i = 0; i <= N; i++) {
      const E = (i / N) * E_MAX
      pts.push(`${i === 0 ? 'M' : 'L'}${fmt(sx(E), 1)},${fmt(sy(dist(E, T)), 1)}`)
    }
    return pts.join(' ')
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mainPath = useMemo(() => path(temp), [temp, yScaleMax])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const coldPath = useMemo(() => path(temp - 200), [temp, yScaleMax])

  const shade = useMemo(() => {
    const pts: string[] = [`M${fmt(sx(ea), 1)},${fmt(sy(0), 1)}`]
    const steps = 80
    for (let i = 0; i <= steps; i++) {
      const E = ea + (i / steps) * (E_MAX - ea)
      pts.push(`L${fmt(sx(E), 1)},${fmt(sy(dist(E, temp)), 1)}`)
    }
    pts.push(`L${fmt(sx(E_MAX), 1)},${fmt(sy(0), 1)} Z`)
    return pts.join(' ')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ea, temp, yScaleMax])

  return (
    <div className="qex mb" data-beat={beat}>
      <div className="qex-stagewrap">
        <svg className="qex-svg" viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Maxwell-Boltzmann distribution at T=${temp}. Fraction past activation energy ${fmt(fracMain * 100, 1)}%.`}>
          <line className="qex-axis" x1={PAD_L} y1={sy(0)} x2={W - PAD_R} y2={sy(0)} />
          <line className="qex-axis" x1={PAD_L} y1={sy(0)} x2={PAD_L} y2={PAD_T} />
          <text className="pd-label mono" x={W - PAD_R} y={sy(0) + 16} textAnchor="end">molecular energy →</text>
          {/* shaded reacting fraction */}
          {beat !== 'temperature' ? <path className="mb-shade" d={shade} /> : null}
          {/* cooler reference curve */}
          {beat === 'temperature' ? <path className="trig-ghost" d={coldPath} fill="none" /> : null}
          {/* main distribution */}
          <path className="qex-curve" d={mainPath} fill="none" />
          {/* activation energy line */}
          <line className={`mb-ea${beat === 'activation' ? ' hot' : ''}`} x1={sx(ea)} y1={sy(0)} x2={sx(ea)} y2={PAD_T} />
          <text className={`mb-ea-label mono${beat === 'activation' ? ' hot' : ''}`} x={sx(ea) + 5} y={PAD_T + 10}>Eₐ</text>
        </svg>
        <p className="qex-draghint micro">raise T to push more molecules past Eₐ · move Eₐ to change the reacting fraction</p>
      </div>

      <div className="qex-panel">
        <div className="qex-eq">
          <span className="qex-eq-row"><span className="qex-eq-tag mono">TEMP</span> T = {temp} K (arb.)</span>
        </div>
        <div className={`qex-disc tone-pos${beat === 'activation' ? ' hot' : ''}`}>
          <span className="qex-disc-val mono">molecules with E ≥ Eₐ</span>
          <span className="qex-disc-label">{fmt(fracMain * 100, 1)}%</span>
        </div>
        <dl className="qex-readout">
          <div className={beat === 'temperature' ? 'rd-hot' : ''}><dt>at T</dt><dd className="mono">{fmt(fracMain * 100, 2)}%</dd></div>
          <div className={beat === 'temperature' ? 'rd-hot' : ''}><dt>at T − 200</dt><dd className="mono">{fmt(fracCold * 100, 2)}%</dd></div>
          <div><dt>fold change</dt><dd className="mono">{fracCold > 0 ? `×${fmt(fracMain / fracCold, 1)}` : '—'}</dd></div>
          <div className={beat === 'activation' ? 'rd-hot' : ''}><dt>Eₐ</dt><dd className="mono">{fmt(ea, 1)}</dd></div>
        </dl>
        <div className="qex-controls">
          <Slider label="T (temperature)" value={temp} min={300} max={900} step={20} onChange={setTemp} />
          <Slider label="Eₐ (activation energy)" value={ea} min={3} max={16} step={0.5} onChange={setEa} />
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
        <span className="qex-slider-val mono">{value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </label>
  )
}
