'use client'

/**
 * Circular Measure Explorer — a sector you can reshape with the radius r and
 * angle θ (radians). The arc s = rθ and sector area A = ½r²θ update live, with
 * the arc and the shaded sector highlighted per beat.
 */

import { useState } from 'react'
import { InlineMath } from 'react-katex'
import type { ExplorableProps } from './registry'

const W = 360
const H = 340
const CX = 165
const CY = 175
const R_MIN_PX = 34
const R_PX_PER_UNIT = 22

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number, dp = 2) => {
  const r = Number(v.toFixed(dp))
  return Object.is(r, -0) ? 0 : r
}

type Beat = 'angle' | 'arc' | 'area'
const BEATS: Beat[] = ['angle', 'arc', 'area']

export function CircularMeasureExplorer({ step, stepCount }: ExplorableProps) {
  const [r, setR] = useState(4)
  const [theta, setTheta] = useState(1.2)
  const beat = BEATS[clamp(step, 0, stepCount - 1)] ?? 'angle'

  const R = R_MIN_PX + r * R_PX_PER_UNIT
  const p0 = { x: CX + R, y: CY }
  const pT = { x: CX + R * Math.cos(theta), y: CY - R * Math.sin(theta) }
  const largeArc = theta > Math.PI ? 1 : 0
  const sectorPath = `M${CX},${CY} L${fmt(p0.x, 1)},${fmt(p0.y, 1)} A${fmt(R, 1)},${fmt(R, 1)} 0 ${largeArc} 0 ${fmt(pT.x, 1)},${fmt(pT.y, 1)} Z`
  const arcPath = `M${fmt(p0.x, 1)},${fmt(p0.y, 1)} A${fmt(R, 1)},${fmt(R, 1)} 0 ${largeArc} 0 ${fmt(pT.x, 1)},${fmt(pT.y, 1)}`

  const arc = r * theta
  const area = 0.5 * r * r * theta
  const deg = (theta * 180) / Math.PI

  return (
    <div className="qex circular" data-beat={beat}>
      <div className="qex-stagewrap">
        <svg className="qex-svg" viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Sector radius ${fmt(r)}, angle ${fmt(theta)} rad. Arc ${fmt(arc)}, area ${fmt(area)}.`}>
          {/* full circle outline */}
          <circle className="circ-outline" cx={CX} cy={CY} r={R} fill="none" />
          {/* shaded sector */}
          <path className={`circ-sector${beat === 'area' ? ' hot' : ''}`} d={sectorPath} />
          {/* radii */}
          <line className="circ-radius" x1={CX} y1={CY} x2={p0.x} y2={p0.y} />
          <line className="circ-radius" x1={CX} y1={CY} x2={pT.x} y2={pT.y} />
          {/* arc */}
          <path className={`circ-arc${beat === 'arc' ? ' hot' : ''}`} d={arcPath} fill="none" />
          {/* angle label near centre */}
          <text className="circ-theta mono" x={CX + 16} y={CY - 8}>θ</text>
          <circle className="circ-centre" cx={CX} cy={CY} r={3} />
        </svg>
        <p className="qex-draghint micro">slide r and θ — arc and sector area update live</p>
      </div>

      <div className="qex-panel">
        <div className="qex-eq">
          <span className="qex-eq-row"><span className="qex-eq-tag mono">ANGLE</span> {fmt(theta)} rad = {fmt(deg, 1)}°</span>
        </div>
        <div className={`circ-formula${beat === 'arc' ? ' hot' : ''}`}>
          <InlineMath math={`s = r\\theta = ${fmt(r)} \\times ${fmt(theta)} = ${fmt(arc)}`} />
        </div>
        <div className={`circ-formula${beat === 'area' ? ' hot' : ''}`}>
          <InlineMath math={`A = \\tfrac{1}{2}r^2\\theta = ${fmt(area)}`} />
        </div>
        <dl className="qex-readout">
          <div className={beat === 'arc' ? 'rd-hot' : ''}><dt>arc length s</dt><dd className="mono">{fmt(arc, 3)}</dd></div>
          <div className={beat === 'area' ? 'rd-hot' : ''}><dt>sector area</dt><dd className="mono">{fmt(area, 3)}</dd></div>
          <div><dt>fraction of circle</dt><dd className="mono">{fmt((theta / (2 * Math.PI)) * 100, 1)}%</dd></div>
          <div><dt>θ in degrees</dt><dd className="mono">{fmt(deg, 1)}°</dd></div>
        </dl>
        <div className="qex-controls">
          <Slider label="r (radius)" value={r} min={1} max={6} step={0.25} onChange={setR} />
          <Slider label="θ (radians)" value={theta} min={0.1} max={2 * Math.PI} step={0.05} onChange={setTheta} />
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
