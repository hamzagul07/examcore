'use client'

/**
 * Geometric Series Explorer — set the first term a and ratio r, add terms, and
 * watch the bars (a, ar, ar², …) and the running partial sum Sₙ. When |r| < 1
 * the partial sums converge on S∞ = a/(1−r); otherwise they diverge. Beats:
 * terms → partial sum → limit.
 */

import { useMemo, useState } from 'react'
import { InlineMath } from 'react-katex'
import type { ExplorableProps } from './registry'

const W = 500
const H = 320
const PAD_L = 36
const PAD_R = 16
const PAD_T = 20
const PAD_B = 34
const NMAX = 14

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number, dp = 2) => {
  const r = Number(v.toFixed(dp))
  return Object.is(r, -0) ? 0 : r
}

type Beat = 'terms' | 'sum' | 'limit'
const BEATS: Beat[] = ['terms', 'sum', 'limit']

export function SeriesExplorer({ step, stepCount }: ExplorableProps) {
  const [a, setA] = useState(3)
  const [r, setR] = useState(0.6)
  const [n, setN] = useState(6)
  const beat = BEATS[clamp(step, 0, stepCount - 1)] ?? 'terms'

  const converges = Math.abs(r) < 1
  const sInf = converges ? a / (1 - r) : NaN

  const { terms, sums } = useMemo(() => {
    const terms: number[] = []
    const sums: number[] = []
    let s = 0
    for (let i = 0; i < n; i++) {
      const term = a * Math.pow(r, i)
      terms.push(term)
      s += term
      sums.push(s)
    }
    return { terms, sums }
  }, [a, r, n])

  const sN = sums[sums.length - 1] ?? 0
  const allVals = [...terms, ...sums, converges ? sInf : 0]
  const yMax = Math.max(1, ...allVals.map((v) => Math.abs(v))) * 1.1
  const yMin = Math.min(0, ...allVals) * 1.1

  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B
  const bx = (i: number) => PAD_L + ((i + 0.5) / NMAX) * plotW
  const by = (v: number) => H - PAD_B - ((v - yMin) / (yMax - yMin)) * plotH
  const barW = (plotW / NMAX) * 0.6

  const sumLine = sums.map((s, i) => `${i === 0 ? 'M' : 'L'}${fmt(bx(i), 1)},${fmt(by(s), 1)}`).join(' ')

  return (
    <div className="qex series" data-beat={beat}>
      <div className="qex-stagewrap">
        <svg className="qex-svg" viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Geometric series a=${fmt(a)}, r=${fmt(r)}. Sum of ${n} terms ${fmt(sN)}.`}>
          <line className="qex-axis" x1={PAD_L} y1={by(0)} x2={W - PAD_R} y2={by(0)} />
          {/* limit line */}
          {converges ? (
            <g className={`series-limit${beat === 'limit' ? ' hot' : ''}`}>
              <line x1={PAD_L} y1={by(sInf)} x2={W - PAD_R} y2={by(sInf)} />
              <text className="series-limit-label mono" x={W - PAD_R} y={by(sInf) - 5} textAnchor="end">S∞ = {fmt(sInf)}</text>
            </g>
          ) : null}
          {/* term bars */}
          {terms.map((t, i) => (
            <rect key={i} className="series-bar" x={bx(i) - barW / 2} y={by(Math.max(0, t))} width={barW} height={Math.abs(by(t) - by(0))} />
          ))}
          {/* partial-sum line */}
          {beat !== 'terms' ? (
            <>
              <path className="series-sumline" d={sumLine} fill="none" />
              {sums.map((s, i) => (
                <circle key={i} className="series-sumdot" cx={bx(i)} cy={by(s)} r={3} />
              ))}
            </>
          ) : null}
        </svg>
        <p className="qex-draghint micro">add terms and change r — watch the partial sums settle (or run away)</p>
      </div>

      <div className="qex-panel">
        <div className="qex-eq">
          <span className="qex-eq-row"><span className="qex-eq-tag mono">SERIES</span> <InlineMath math={`${fmt(a)} + ${fmt(a)}(${fmt(r)}) + ${fmt(a)}(${fmt(r)})^2 + \\dots`} /></span>
        </div>
        <div className={`qex-disc ${converges ? 'tone-pos' : 'tone-neg'}${beat === 'limit' ? ' hot' : ''}`}>
          <span className="qex-disc-val mono">{converges ? 'S∞ = a/(1−r)' : 'diverges (|r| ≥ 1)'}</span>
          <span className="qex-disc-label">{converges ? fmt(sInf, 3) : '∞'}</span>
        </div>
        <dl className="qex-readout">
          <div className={beat === 'sum' ? 'rd-hot' : ''}><dt>Sₙ ({n} terms)</dt><dd className="mono">{fmt(sN, 3)}</dd></div>
          <div><dt>nth term arⁿ⁻¹</dt><dd className="mono">{fmt(terms[terms.length - 1] ?? 0, 3)}</dd></div>
          <div><dt>ratio r</dt><dd className="mono">{fmt(r)}</dd></div>
          <div className={beat === 'limit' ? 'rd-hot' : ''}><dt>converges?</dt><dd>{converges ? 'yes, |r|<1' : 'no'}</dd></div>
        </dl>
        <div className="qex-controls">
          <Slider label="a (first term)" value={a} min={1} max={5} step={0.5} onChange={setA} />
          <Slider label="r (ratio)" value={r} min={-0.95} max={1.4} step={0.05} onChange={setR} />
          <label className="qex-slider">
            <span className="qex-slider-head"><span className="qex-slider-label mono">n (terms)</span><span className="qex-slider-val mono">{n}</span></span>
            <input type="range" min={1} max={NMAX} step={1} value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="number of terms" />
          </label>
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
