'use client'

import { useId, useMemo } from 'react'
import { Gauge } from 'lucide-react'
import {
  ACCURACY_THRESHOLD,
  QUADRANT_COPY,
  type SpeedAccuracyData,
} from '@/lib/insights/speed-accuracy'

/**
 * Speed vs accuracy, plotted.
 *
 * The Patterns panel already says which quadrant you mostly live in. A sentence
 * can't show the spread — whether you're consistently rushing or just had two
 * bad nights — and spread is the whole diagnostic value of this measure.
 *
 * Form: two measures per attempt with no time ordering is a SCATTER. Position
 * already carries the classification (that is what a quadrant chart is for), so
 * the points stay a SINGLE hue rather than four categorical colours — which
 * also keeps it under the three-series cap that all-pairs forms like scatter
 * have. The quadrants are named in the plot area instead.
 *
 * Honest framing matters here: "fast" and "slow" are relative to the student's
 * OWN median, so about half their attempts sit on each side by construction.
 * Said plainly under the chart, because a student otherwise reads "fast" as a
 * statement about real exam pace.
 */

const W = 520
const H = 340
const PAD = { top: 18, right: 16, bottom: 40, left: 46 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

function niceCeil(v: number): number {
  if (v <= 10) return Math.ceil(v)
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  return Math.ceil(v / (mag / 2)) * (mag / 2)
}

export function SpeedAccuracyChart({ data }: { data: SpeedAccuracyData }) {
  const gradId = useId()
  const { points, median } = data

  const xMax = useMemo(() => {
    if (points.length === 0) return 60
    // Headroom so the slowest point isn't glued to the axis.
    const ceil = niceCeil(Math.max(...points.map((p) => p.timePerMark)) * 1.12)
    // Guard the degenerate all-zero-pace case: niceCeil(0) is 0, which would make
    // every x() divide by zero → NaN and hide the whole scatter. Only substitutes
    // when the real ceiling is 0, so genuine fast-pace charts aren't stretched.
    return ceil > 0 ? ceil : 60
  }, [points])

  if (points.length < 3 || median == null) return null

  const x = (tpm: number) => PAD.left + (tpm / xMax) * PLOT_W
  const y = (pct: number) => PAD.top + (1 - pct / 100) * PLOT_H
  const medianX = x(median)
  const threshY = y(ACCURACY_THRESHOLD)

  // Newest attempt gets emphasis — "where am I now" against the cloud of
  // "where have I been".
  const newest = points.reduce((a, b) =>
    new Date(b.createdAt) > new Date(a.createdAt) ? b : a
  )

  const quadLabels: Array<{ qx: number; qy: number; text: string; anchor: 'start' | 'end' }> = [
    { qx: medianX - 8, qy: PAD.top + 14, text: QUADRANT_COPY.master.short, anchor: 'end' },
    { qx: medianX + 8, qy: PAD.top + 14, text: QUADRANT_COPY.perfectionist.short, anchor: 'start' },
    { qx: medianX - 8, qy: PAD.top + PLOT_H - 8, text: QUADRANT_COPY.rushed.short, anchor: 'end' },
    { qx: medianX + 8, qy: PAD.top + PLOT_H - 8, text: QUADRANT_COPY.critical.short, anchor: 'start' },
  ]

  return (
    <section className="ms-dash-card ms-sa-chart min-w-0">
      <div className="mb-4 flex items-center gap-2">
        <Gauge className="h-4 w-4 text-[var(--ec-brand)]" aria-hidden="true" />
        <p className="ms-overline" style={{ marginBottom: 0 }}>
          Speed vs accuracy
        </p>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="ms-sa-svg"
        role="img"
        aria-label={`Scatter of ${points.length} timed attempts. Horizontal axis is seconds per mark, vertical axis is accuracy. ${data.counts.master} fast and accurate, ${data.counts.perfectionist} accurate but slow, ${data.counts.rushed} fast but losing marks, ${data.counts.critical} slow and losing marks.`}
      >
        <defs>
          <radialGradient id={gradId}>
            <stop offset="0%" stopColor="var(--ec-brand)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--ec-brand)" stopOpacity="0.55" />
          </radialGradient>
        </defs>

        {/* Recessive grid: horizontal only, so the eye reads accuracy bands. */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={PAD.left + PLOT_W}
              y1={y(v)}
              y2={y(v)}
              className="ms-sa-grid"
            />
            <text x={PAD.left - 9} y={y(v) + 4} className="ms-sa-tick" textAnchor="end">
              {v}%
            </text>
          </g>
        ))}

        {/* The two dividers that define the quadrants. Dashed so they read as
            reference lines, not as data. */}
        <line
          x1={medianX}
          x2={medianX}
          y1={PAD.top}
          y2={PAD.top + PLOT_H}
          className="ms-sa-divider"
        />
        <line
          x1={PAD.left}
          x2={PAD.left + PLOT_W}
          y1={threshY}
          y2={threshY}
          className="ms-sa-divider"
        />

        {quadLabels.map((q) => (
          <text
            key={q.text}
            x={q.qx}
            y={q.qy}
            textAnchor={q.anchor}
            className="ms-sa-quad"
          >
            {q.text}
          </text>
        ))}

        {points.map((p) => {
          const isNewest = p.id === newest.id
          return (
            <circle
              key={p.id}
              cx={x(p.timePerMark)}
              cy={y(p.pct)}
              r={isNewest ? 7 : 5}
              className={`ms-sa-dot ${isNewest ? 'is-newest' : ''}`}
              fill={isNewest ? 'var(--ec-brand)' : `url(#${gradId})`}
            >
              <title>
                {`${Math.round(p.pct)}% · ${p.timePerMark.toFixed(1)}s per mark · ${
                  QUADRANT_COPY[p.quadrant].label
                }`}
              </title>
            </circle>
          )
        })}

        {/* Without ticks the horizontal axis is unquantified — a reader cannot
            tell whether the spread is 10s or 100s per mark. Three is enough to
            scale it without crowding the plot. */}
        {[0, xMax / 2, xMax].map((v, i) => (
          <text
            key={v}
            x={x(v)}
            y={PAD.top + PLOT_H + 16}
            textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}
            className="ms-sa-tick"
          >
            {Math.round(v)}s
          </text>
        ))}

        <text
          x={PAD.left + PLOT_W / 2}
          y={H - 6}
          textAnchor="middle"
          className="ms-sa-axis"
        >
          seconds per mark →
        </text>
      </svg>

      <p className="ms-sa-note">
        The vertical line is <strong>your own median pace</strong> ({median.toFixed(1)}s
        per mark), so about half your attempts sit either side of it — it says
        nothing about real exam timing. The horizontal line is{' '}
        {ACCURACY_THRESHOLD}%. The solid dot is your most recent mark.
      </p>
    </section>
  )
}
