'use client'

/**
 * Potential Divider Explorer — two resistors in series split the supply voltage
 * in proportion to their resistances: V_out = V_in · R₂/(R₁+R₂). Slide R₁, R₂
 * and V_in and watch the output and the voltage bar. Beats: the divider → the
 * ratio → the current.
 */

import { useState } from 'react'
import { InlineMath } from 'react-katex'
import type { ExplorableProps } from './registry'

const W = 360
const H = 320
const BAR_X = 250
const BAR_TOP = 40
const BAR_BOT = 280

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number, dp = 2) => {
  const r = Number(v.toFixed(dp))
  return Object.is(r, -0) ? 0 : r
}

type Beat = 'divider' | 'ratio' | 'current'
const BEATS: Beat[] = ['divider', 'ratio', 'current']

export function PotentialDividerExplorer({ step, stepCount }: ExplorableProps) {
  const [vin, setVin] = useState(9)
  const [r1, setR1] = useState(4)
  const [r2, setR2] = useState(2)
  const beat = BEATS[clamp(step, 0, stepCount - 1)] ?? 'divider'

  const vOut = (vin * r2) / (r1 + r2)
  const vR1 = vin - vOut
  const current = vin / (r1 + r2) // mA if R in kΩ and V in V

  const barH = BAR_BOT - BAR_TOP
  const splitY = BAR_TOP + (vR1 / vin) * barH // boundary between R1 drop (top) and R2 drop (bottom)

  return (
    <div className="qex divider" data-beat={beat}>
      <div className="qex-stagewrap">
        <svg className="qex-svg" viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Potential divider: Vin ${fmt(vin)} V, R1 ${r1}, R2 ${r2}, Vout ${fmt(vOut)} V.`}>
          {/* circuit: supply + two series resistors (simple schematic) */}
          <line className="pd-wire" x1={60} y1={BAR_TOP} x2={60} y2={BAR_BOT} />
          <line className="pd-wire" x1={60} y1={BAR_TOP} x2={130} y2={BAR_TOP} />
          <line className="pd-wire" x1={60} y1={BAR_BOT} x2={130} y2={BAR_BOT} />
          {/* battery label */}
          <text className="pd-label mono" x={48} y={(BAR_TOP + BAR_BOT) / 2} textAnchor="end">{fmt(vin)}V</text>
          {/* R1 box (top) */}
          <rect className={`pd-r1${beat === 'ratio' ? ' hot' : ''}`} x={110} y={BAR_TOP + 30} width={40} height={50} rx={4} />
          <text className="pd-label mono" x={130} y={BAR_TOP + 22} textAnchor="middle">R₁={r1}</text>
          {/* R2 box (bottom) */}
          <rect className={`pd-r2${beat === 'ratio' ? ' hot' : ''}`} x={110} y={BAR_BOT - 80} width={40} height={50} rx={4} />
          <text className="pd-label mono" x={130} y={BAR_BOT - 86} textAnchor="middle">R₂={r2}</text>
          <line className="pd-wire" x1={130} y1={BAR_TOP} x2={130} y2={BAR_TOP + 30} />
          <line className="pd-wire" x1={130} y1={BAR_TOP + 80} x2={130} y2={BAR_BOT - 80} />
          <line className="pd-wire" x1={130} y1={BAR_BOT - 30} x2={130} y2={BAR_BOT} />
          {/* output tap (across R2) */}
          <line className="pd-tap" x1={150} y1={BAR_TOP + 55} x2={210} y2={BAR_TOP + 55} />
          <text className="pd-label mono" x={212} y={BAR_TOP + 50}>Vout</text>

          {/* voltage bar */}
          <rect className="pd-bar-r1" x={BAR_X} y={BAR_TOP} width={26} height={splitY - BAR_TOP} />
          <rect className={`pd-bar-r2${beat !== 'current' ? ' hot' : ''}`} x={BAR_X} y={splitY} width={26} height={BAR_BOT - splitY} />
          <text className="pd-label mono" x={BAR_X + 34} y={(BAR_TOP + splitY) / 2}>{fmt(vR1)}V</text>
          <text className="pd-label mono" x={BAR_X + 34} y={(splitY + BAR_BOT) / 2}>{fmt(vOut)}V</text>
        </svg>
        <p className="qex-draghint micro">slide the resistors — the bigger share of voltage sits across the bigger resistor</p>
      </div>

      <div className="qex-panel">
        <div className={`circ-formula${beat === 'ratio' ? ' hot' : ''}`}>
          <InlineMath math={'V_{out} = V_{in}\\,\\dfrac{R_2}{R_1+R_2}'} />
        </div>
        <div className={`qex-disc tone-pos${beat === 'divider' ? ' hot' : ''}`}>
          <span className="qex-disc-val mono">V_out across R₂</span>
          <span className="qex-disc-label">{fmt(vOut, 2)} V</span>
        </div>
        <dl className="qex-readout">
          <div><dt>V across R₁</dt><dd className="mono">{fmt(vR1)} V</dd></div>
          <div><dt>V across R₂</dt><dd className="mono">{fmt(vOut)} V</dd></div>
          <div className={beat === 'current' ? 'rd-hot' : ''}><dt>current</dt><dd className="mono">{fmt(current, 2)} (V/ΣR)</dd></div>
          <div className={beat === 'ratio' ? 'rd-hot' : ''}><dt>ratio R₂:ΣR</dt><dd className="mono">{fmt((r2 / (r1 + r2)) * 100, 0)}%</dd></div>
        </dl>
        <div className="qex-controls">
          <Slider label="V_in (V)" value={vin} min={1} max={12} step={0.5} onChange={setVin} />
          <Slider label="R₁" value={r1} min={1} max={10} step={0.5} onChange={setR1} />
          <Slider label="R₂" value={r2} min={1} max={10} step={0.5} onChange={setR2} />
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
