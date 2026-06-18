'use client'

/**
 * Radioactive Decay Explorer — set the initial nuclei N₀ and the half-life, then
 * watch the exponential decay play out over time. Half-life markers show N
 * halving each t½. Beats: the decay curve → half-life → the decay constant.
 */

import { useMemo, useState } from 'react'
import { InlineMath } from 'react-katex'
import type { ExplorableProps } from './registry'
import { useAnimatedTime } from './useAnimatedTime'
import { TimeSlider } from './TimeSlider'

const W = 480
const H = 340
const PAD_L = 44
const PAD_R = 16
const PAD_T = 18
const PAD_B = 34
const T_MAX = 6 // in units of half-life shown on the axis
const N = 160

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number, dp = 0) => {
  const r = Number(v.toFixed(dp))
  return Object.is(r, -0) ? 0 : r
}

type Beat = 'curve' | 'halflife' | 'constant'
const BEATS: Beat[] = ['curve', 'halflife', 'constant']

export function RadioactiveDecayExplorer({ step, stepCount }: ExplorableProps) {
  const [n0, setN0] = useState(1000)
  const [halfLife, setHalfLife] = useState(2) // seconds
  const { t: tFrac, scrub: setTFrac, playing, toggle } = useAnimatedTime(0.12, 0)
  const beat = BEATS[clamp(step, 0, stepCount - 1)] ?? 'curve'

  const tMaxSecs = T_MAX * halfLife
  const t = tFrac * tMaxSecs
  const lambda = Math.LN2 / halfLife
  const nNow = n0 * Math.exp(-lambda * t)
  const activity = lambda * nNow

  const sx = (secs: number) => PAD_L + (secs / tMaxSecs) * (W - PAD_L - PAD_R)
  const sy = (n: number) => H - PAD_B - (n / n0) * (H - PAD_T - PAD_B)

  const curve = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= N; i++) {
      const secs = (i / N) * tMaxSecs
      pts.push(`${i === 0 ? 'M' : 'L'}${fmt(sx(secs), 1)},${fmt(sy(n0 * Math.exp(-lambda * secs)), 1)}`)
    }
    return pts.join(' ')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n0, halfLife])

  const halfMarks = [1, 2, 3, 4, 5].map((k) => ({ k, secs: k * halfLife, n: n0 / 2 ** k }))

  return (
    <div className="qex decay" data-beat={beat}>
      <div className="qex-stagewrap">
        <svg className="qex-svg" viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Radioactive decay, half-life ${halfLife}s. N now ${fmt(nNow)}.`}>
          <line className="qex-axis" x1={PAD_L} y1={sy(0)} x2={W - PAD_R} y2={sy(0)} />
          <line className="qex-axis" x1={PAD_L} y1={sy(0)} x2={PAD_L} y2={PAD_T} />
          <text className="pd-label mono" x={W - PAD_R} y={sy(0) + 16} textAnchor="end">time →</text>
          <text className="pd-label mono" x={PAD_L - 6} y={sy(n0) + 4} textAnchor="end">N₀</text>
          {/* half-life markers */}
          {beat !== 'constant' && halfMarks.map(({ k, secs, n }) => (
            <g key={k} className={`decay-half${beat === 'halflife' ? ' hot' : ''}`}>
              <line x1={sx(secs)} y1={sy(0)} x2={sx(secs)} y2={sy(n)} />
              <line x1={PAD_L} y1={sy(n)} x2={sx(secs)} y2={sy(n)} />
              {beat === 'halflife' ? <text className="pd-label mono" x={sx(secs)} y={sy(n) - 4} textAnchor="middle">{fmt(n0 / 2 ** k)}</text> : null}
            </g>
          ))}
          {/* decay curve */}
          <path className="qex-curve" d={curve} fill="none" />
          {/* current point */}
          <line className="decay-now" x1={sx(t)} y1={sy(0)} x2={sx(t)} y2={sy(nNow)} />
          <circle className="decay-dot" cx={sx(t)} cy={sy(nNow)} r={5.5} />
        </svg>
        <p className="qex-draghint micro">play time to watch the sample decay · each half-life halves what remains</p>
      </div>

      <div className="qex-panel">
        <div className="qex-eq">
          <span className="qex-eq-row"><span className="qex-eq-tag mono">DECAY</span> <InlineMath math={`N = N_0 e^{-\\lambda t}`} /></span>
        </div>
        <div className={`qex-disc tone-pos${beat === 'curve' ? ' hot' : ''}`}>
          <span className="qex-disc-val mono">nuclei remaining</span>
          <span className="qex-disc-label">{fmt(nNow)}</span>
        </div>
        <dl className="qex-readout">
          <div className={beat === 'halflife' ? 'rd-hot' : ''}><dt>half-life t½</dt><dd className="mono">{fmt(halfLife, 1)} s</dd></div>
          <div className={beat === 'constant' ? 'rd-hot' : ''}><dt>decay const λ = ln2/t½</dt><dd className="mono">{fmt(lambda, 3)} /s</dd></div>
          <div><dt>time elapsed</dt><dd className="mono">{fmt(t, 1)} s</dd></div>
          <div><dt>activity λN</dt><dd className="mono">{fmt(activity)} /s</dd></div>
        </dl>
        <div className="qex-controls">
          <Slider label="N₀ (initial nuclei)" value={n0} min={200} max={2000} step={100} onChange={setN0} />
          <Slider label="half-life (s)" value={halfLife} min={0.5} max={4} step={0.25} onChange={setHalfLife} />
          <TimeSlider value={tFrac} playing={playing} onScrub={setTFrac} onToggle={toggle} />
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
