'use client'

/**
 * Exponential & Logarithm Explorer — shape y = a·bˣ with sliders, see growth vs
 * decay, and reveal the logarithm as its mirror image in y = x. Beats: the
 * curve → growth/decay → the inverse (log).
 */

import { useMemo, useState } from 'react'
import { InlineMath } from 'react-katex'
import type { ExplorableProps } from './registry'

const W = 440
const H = 380
const PAD = 30
const MIN = -4
const MAX = 8
const N = 140

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number, dp = 2) => {
  const r = Number(v.toFixed(dp))
  return Object.is(r, -0) ? 0 : r
}
const sx = (x: number) => PAD + ((x - MIN) / (MAX - MIN)) * (W - 2 * PAD)
const sy = (y: number) => H - PAD - ((y - MIN) / (MAX - MIN)) * (H - 2 * PAD)

type Beat = 'curve' | 'growthdecay' | 'inverse'
const BEATS: Beat[] = ['curve', 'growthdecay', 'inverse']

export function ExpLogExplorer({ step, stepCount }: ExplorableProps) {
  const [a, setA] = useState(1)
  const [b, setB] = useState(2)
  const beat = BEATS[clamp(step, 0, stepCount - 1)] ?? 'curve'
  const growth = b > 1

  const expPath = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= N; i++) {
      const x = MIN + (i / N) * (MAX - MIN)
      const y = a * Math.pow(b, x)
      pts.push(`${i === 0 ? 'M' : 'L'}${fmt(sx(x), 1)},${fmt(sy(clamp(y, MIN - 5, MAX + 5)), 1)}`)
    }
    return pts.join(' ')
  }, [a, b])

  // inverse: reflection of y = a bˣ in y = x  →  x = a bʸ, i.e. plot (a bʸ, y)
  const logPath = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= N; i++) {
      const y = MIN + (i / N) * (MAX - MIN)
      const x = a * Math.pow(b, y)
      pts.push(`${i === 0 ? 'M' : 'L'}${fmt(sx(clamp(x, MIN - 5, MAX + 5)), 1)},${fmt(sy(y), 1)}`)
    }
    return pts.join(' ')
  }, [a, b])

  return (
    <div className="qex explog" data-beat={beat}>
      <div className="qex-stagewrap">
        <svg className="qex-svg" viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`y = ${fmt(a)} times ${fmt(b)} to the x. ${growth ? 'Growth' : 'Decay'}.`}>
          {[-2, 2, 4, 6].map((g) => (
            <g key={g}>
              <line className="qex-grid" x1={sx(g)} y1={sy(MIN)} x2={sx(g)} y2={sy(MAX)} />
              <line className="qex-grid" x1={sx(MIN)} y1={sy(g)} x2={sx(MAX)} y2={sy(g)} />
            </g>
          ))}
          <line className="qex-axis" x1={sx(MIN)} y1={sy(0)} x2={sx(MAX)} y2={sy(0)} />
          <line className="qex-axis" x1={sx(0)} y1={sy(MIN)} x2={sx(0)} y2={sy(MAX)} />
          {/* y = x mirror + inverse */}
          {beat === 'inverse' ? (
            <>
              <line className="explog-mirror" x1={sx(MIN)} y1={sy(MIN)} x2={sx(MAX)} y2={sy(MAX)} />
              <path className="explog-log" d={logPath} fill="none" />
            </>
          ) : null}
          {/* y-intercept marker */}
          <circle className="qex-yint" cx={sx(0)} cy={sy(a)} r={4} />
          {/* the exponential */}
          <path className="qex-curve" d={expPath} fill="none" />
        </svg>
        <p className="qex-draghint micro">change a and b · b &gt; 1 grows, b &lt; 1 decays</p>
      </div>

      <div className="qex-panel">
        <div className="qex-eq">
          <span className="qex-eq-row"><span className="qex-eq-tag mono">FN</span> <InlineMath math={`y = ${fmt(a)}\\cdot ${fmt(b)}^{x}`} /></span>
        </div>
        <div className={`qex-disc ${growth ? 'tone-pos' : 'tone-mid'}${beat === 'growthdecay' ? ' hot' : ''}`}>
          <span className="qex-disc-val mono">b {growth ? '> 1' : '< 1'}</span>
          <span className="qex-disc-label">{growth ? 'exponential growth' : 'exponential decay'}</span>
        </div>
        <dl className="qex-readout">
          <div><dt>y-intercept (x=0)</dt><dd className="mono">{fmt(a)}</dd></div>
          <div><dt>value at x=1</dt><dd className="mono">{fmt(a * b)}</dd></div>
          <div><dt>value at x=2</dt><dd className="mono">{fmt(a * b * b)}</dd></div>
          <div className={beat === 'inverse' ? 'rd-hot' : ''}><dt>inverse</dt><dd className="mono">log base {fmt(b)}</dd></div>
        </dl>
        <div className="qex-controls">
          <Slider label="a (start value)" value={a} min={0.5} max={4} step={0.25} onChange={setA} />
          <Slider label="b (base)" value={b} min={0.3} max={3} step={0.05} onChange={(v) => setB(v === 1 ? 1.05 : v)} />
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
