'use client'

/**
 * Stationary Wave Explorer — pick the harmonic n and scrub time to watch a
 * standing wave on a string of length L oscillate between its extremes. Nodes
 * and antinodes are marked; wavelength λ = 2L/n updates live. Beats: pattern →
 * nodes & antinodes → harmonics.
 */

import { useMemo, useState } from 'react'
import { InlineMath } from 'react-katex'
import type { ExplorableProps } from './registry'

const W = 520
const H = 240
const PAD_X = 36
const MIDY = 120
const AMP = 70

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number, dp = 2) => {
  const r = Number(v.toFixed(dp))
  return Object.is(r, -0) ? 0 : r
}

type Beat = 'pattern' | 'nodes' | 'harmonics'
const BEATS: Beat[] = ['pattern', 'nodes', 'harmonics']

export function StationaryWaveExplorer({ step, stepCount }: ExplorableProps) {
  const [n, setN] = useState(3)
  const [tFrac, setTFrac] = useState(0.2)
  const beat = BEATS[clamp(step, 0, stepCount - 1)] ?? 'pattern'

  const x0 = PAD_X
  const x1 = W - PAD_X
  const L = x1 - x0
  const env = Math.cos(2 * Math.PI * tFrac) // standing-wave time envelope
  const shape = (frac: number, e: number) => MIDY - AMP * e * Math.sin(n * Math.PI * frac)

  const wave = useMemo(() => {
    const pts: string[] = []
    const steps = 220
    for (let i = 0; i <= steps; i++) {
      const frac = i / steps
      pts.push(`${i === 0 ? 'M' : 'L'}${fmt(x0 + frac * L, 1)},${fmt(shape(frac, env), 1)}`)
    }
    return pts.join(' ')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, env])

  const envelopeUp = useMemo(() => buildEnvelope(n, x0, L, 1), [n, x0, L])
  const envelopeDn = useMemo(() => buildEnvelope(n, x0, L, -1), [n, x0, L])

  // nodes at frac = k/n, antinodes at (k+0.5)/n
  const nodes = Array.from({ length: n + 1 }, (_, k) => x0 + (k / n) * L)
  const antinodes = Array.from({ length: n }, (_, k) => x0 + ((k + 0.5) / n) * L)

  return (
    <div className="qex stationary" data-beat={beat}>
      <div className="qex-stagewrap">
        <svg className="qex-svg" viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Stationary wave, harmonic ${n}, ${n + 1} nodes and ${n} antinodes.`}>
          {/* string supports */}
          <line className="stat-support" x1={x0} y1={MIDY - 24} x2={x0} y2={MIDY + 24} />
          <line className="stat-support" x1={x1} y1={MIDY - 24} x2={x1} y2={MIDY + 24} />
          <line className="qex-axis" x1={x0} y1={MIDY} x2={x1} y2={MIDY} />
          {/* faint envelope (both extremes) */}
          <path className="trig-ghost" d={envelopeUp} fill="none" />
          <path className="trig-ghost" d={envelopeDn} fill="none" />
          {/* the oscillating wave */}
          <path className="qex-curve" d={wave} fill="none" />
          {/* nodes */}
          {(beat !== 'pattern') && nodes.map((nx, i) => (
            <circle key={`n${i}`} className={`stat-node${beat === 'nodes' ? ' hot' : ''}`} cx={nx} cy={MIDY} r={4} />
          ))}
          {/* antinodes */}
          {beat === 'nodes' && antinodes.map((ax, i) => (
            <line key={`a${i}`} className="stat-antinode" x1={ax} y1={MIDY - AMP} x2={ax} y2={MIDY + AMP} />
          ))}
        </svg>
        <p className="qex-draghint micro">change the harmonic n · scrub time to oscillate the string</p>
      </div>

      <div className="qex-panel">
        <div className="qex-eq">
          <span className="qex-eq-row"><span className="qex-eq-tag mono">HARMONIC</span> n = {n}</span>
        </div>
        <div className={`circ-formula${beat === 'harmonics' ? ' hot' : ''}`}>
          <InlineMath math={`\\lambda = \\dfrac{2L}{n} = \\dfrac{2L}{${n}}`} />
        </div>
        <dl className="qex-readout">
          <div className={beat === 'nodes' ? 'rd-hot' : ''}><dt>nodes</dt><dd className="mono">{n + 1}</dd></div>
          <div className={beat === 'nodes' ? 'rd-hot' : ''}><dt>antinodes</dt><dd className="mono">{n}</dd></div>
          <div className={beat === 'harmonics' ? 'rd-hot' : ''}><dt>wavelength</dt><dd className="mono">2L/{n}</dd></div>
          <div><dt>half-wavelengths in L</dt><dd className="mono">{n}</dd></div>
        </dl>
        <div className="qex-controls">
          <label className="qex-slider">
            <span className="qex-slider-head"><span className="qex-slider-label mono">n (harmonic)</span><span className="qex-slider-val mono">{n}</span></span>
            <input type="range" min={1} max={6} step={1} value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="harmonic number" />
          </label>
          <label className="qex-slider">
            <span className="qex-slider-head"><span className="qex-slider-label mono">time</span><span className="qex-slider-val mono">{fmt(tFrac, 2)}</span></span>
            <input type="range" min={0} max={1} step={0.005} value={tFrac} onChange={(e) => setTFrac(Number(e.target.value))} aria-label="time" />
          </label>
        </div>
      </div>
    </div>
  )
}

function buildEnvelope(n: number, x0: number, L: number, sign: number): string {
  const pts: string[] = []
  const steps = 200
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps
    const y = MIDY - sign * AMP * Math.sin(n * Math.PI * frac)
    pts.push(`${i === 0 ? 'M' : 'L'}${fmt(x0 + frac * L, 1)},${fmt(y, 1)}`)
  }
  return pts.join(' ')
}
