'use client'

/**
 * Supply & Demand Explorer — shift the demand and supply curves and watch the
 * equilibrium price and quantity move. Set a price away from equilibrium to see
 * the resulting surplus or shortage. Beats: the curves → equilibrium → surplus
 * & shortage.
 */

import { useState } from 'react'
import { InlineMath } from 'react-katex'
import type { ExplorableProps } from './registry'

const W = 440
const H = 380
const PAD_L = 40
const PAD_R = 18
const PAD_T = 20
const PAD_B = 36
const Q_MAX = 10
const P_MAX = 10
const SLOPE = 0.8

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number, dp = 2) => {
  const r = Number(v.toFixed(dp))
  return Object.is(r, -0) ? 0 : r
}
const sx = (q: number) => PAD_L + (q / Q_MAX) * (W - PAD_L - PAD_R)
const sy = (p: number) => H - PAD_B - (p / P_MAX) * (H - PAD_T - PAD_B)

type Beat = 'curves' | 'equilibrium' | 'surplus'
const BEATS: Beat[] = ['curves', 'equilibrium', 'surplus']

export function SupplyDemandExplorer({ step, stepCount }: ExplorableProps) {
  const [dShift, setDShift] = useState(8) // demand intercept (P at Q=0)
  const [sShift, setSShift] = useState(1) // supply intercept
  const [price, setPrice] = useState(5)
  const beat = BEATS[clamp(step, 0, stepCount - 1)] ?? 'curves'

  // demand: P = dShift − SLOPE·Q ; supply: P = sShift + SLOPE·Q
  const qStar = clamp((dShift - sShift) / (2 * SLOPE), 0, Q_MAX)
  const pStar = sShift + SLOPE * qStar
  const qd = clamp((dShift - price) / SLOPE, 0, Q_MAX)
  const qs = clamp((price - sShift) / SLOPE, 0, Q_MAX)
  const gap = qs - qd // >0 surplus, <0 shortage
  const surplus = gap > 0.05
  const shortage = gap < -0.05

  const demandLine = { x1: sx(0), y1: sy(dShift), x2: sx(Q_MAX), y2: sy(dShift - SLOPE * Q_MAX) }
  const supplyLine = { x1: sx(0), y1: sy(sShift), x2: sx(Q_MAX), y2: sy(sShift + SLOPE * Q_MAX) }

  return (
    <div className="qex supplydemand" data-beat={beat}>
      <div className="qex-stagewrap">
        <svg className="qex-svg" viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Supply and demand. Equilibrium price ${fmt(pStar)}, quantity ${fmt(qStar)}.`}>
          <line className="qex-axis" x1={sx(0)} y1={sy(0)} x2={sx(Q_MAX)} y2={sy(0)} />
          <line className="qex-axis" x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(P_MAX)} />
          <text className="pd-label mono" x={sx(Q_MAX)} y={sy(0) + 16} textAnchor="end">Quantity</text>
          <text className="pd-label mono" x={4} y={sy(P_MAX) + 4}>Price</text>

          {/* price line + surplus/shortage gap */}
          {beat === 'surplus' ? (
            <>
              <line className="sd-priceline" x1={sx(0)} y1={sy(price)} x2={sx(Q_MAX)} y2={sy(price)} />
              <line className={`sd-gap ${surplus ? 'surplus' : shortage ? 'shortage' : ''}`} x1={sx(Math.min(qd, qs))} y1={sy(price)} x2={sx(Math.max(qd, qs))} y2={sy(price)} />
              <text className="sd-gap-label mono" x={sx((qd + qs) / 2)} y={sy(price) - 8} textAnchor="middle">
                {surplus ? 'surplus' : shortage ? 'shortage' : ''}
              </text>
            </>
          ) : null}

          {/* curves */}
          <line className="sd-demand" x1={demandLine.x1} y1={demandLine.y1} x2={demandLine.x2} y2={demandLine.y2} />
          <line className="sd-supply" x1={supplyLine.x1} y1={supplyLine.y1} x2={supplyLine.x2} y2={supplyLine.y2} />
          <text className="sd-label demand mono" x={demandLine.x2 - 6} y={demandLine.y2 - 6} textAnchor="end">D</text>
          <text className="sd-label supply mono" x={supplyLine.x2 - 6} y={supplyLine.y2 + 14} textAnchor="end">S</text>

          {/* equilibrium */}
          {beat !== 'curves' ? (
            <g className={`sd-eq${beat === 'equilibrium' ? ' hot' : ''}`}>
              <line className="sd-eq-drop" x1={sx(qStar)} y1={sy(0)} x2={sx(qStar)} y2={sy(pStar)} />
              <line className="sd-eq-drop" x1={sx(0)} y1={sy(pStar)} x2={sx(qStar)} y2={sy(pStar)} />
              <circle cx={sx(qStar)} cy={sy(pStar)} r={5.5} />
            </g>
          ) : null}
        </svg>
        <p className="qex-draghint micro">shift the curves · set a price off equilibrium to see surplus or shortage</p>
      </div>

      <div className="qex-panel">
        <div className="qex-eq">
          <span className="qex-eq-row"><span className="qex-eq-tag mono">EQUILIBRIUM</span> <InlineMath math={`P^* = ${fmt(pStar)},\\; Q^* = ${fmt(qStar)}`} /></span>
        </div>
        <div className={`qex-disc ${surplus ? 'tone-neg' : shortage ? 'tone-mid' : 'tone-pos'}${beat === 'surplus' ? ' hot' : ''}`}>
          <span className="qex-disc-val mono">at price {fmt(price)}</span>
          <span className="qex-disc-label">{surplus ? `surplus of ${fmt(gap)}` : shortage ? `shortage of ${fmt(-gap)}` : 'market clears'}</span>
        </div>
        <dl className="qex-readout">
          <div className={beat === 'equilibrium' ? 'rd-hot' : ''}><dt>equilibrium price</dt><dd className="mono">{fmt(pStar)}</dd></div>
          <div className={beat === 'equilibrium' ? 'rd-hot' : ''}><dt>equilibrium qty</dt><dd className="mono">{fmt(qStar)}</dd></div>
          <div><dt>quantity demanded</dt><dd className="mono">{fmt(qd)}</dd></div>
          <div><dt>quantity supplied</dt><dd className="mono">{fmt(qs)}</dd></div>
        </dl>
        <div className="qex-controls">
          <Slider label="shift demand" value={dShift} min={5} max={10} step={0.25} onChange={setDShift} />
          <Slider label="shift supply" value={sShift} min={0} max={4} step={0.25} onChange={setSShift} />
          <Slider label="price" value={price} min={0.5} max={9.5} step={0.25} onChange={setPrice} />
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
