'use client'

import { useId, useMemo } from 'react'
import { EmptyState } from './EmptyState'
import { GRADE_BOUNDARIES } from '@/lib/grade-boundaries'
import { gapToTargetGrade } from '@/lib/target-grade'
import type { AttemptLite } from '@/lib/mastery'
import type { GradePrediction } from '@/lib/prediction'
type Props = {
  attempts: AttemptLite[]
  prediction: GradePrediction
  /** IB subjects are graded 1–7 — the Cambridge letter estimate doesn't apply. */
  ibMode?: boolean
  /** The grade the student is aiming for (Cambridge letter), if set. */
  targetGrade?: string | null
}

/**
 * Trajectory chart + predictive grade card. The chart is hand-rolled SVG —
 * Recharts isn't in our bundle and a dedicated chart library would be
 * overkill for one line + six horizontal reference lines.
 */
export function GradeTrajectory({
  attempts,
  prediction,
  ibMode = false,
  targetGrade = null,
}: Props) {
  // Last 10 attempts, oldest-first so the line reads left-to-right.
  const series = useMemo(() => {
    const recent = attempts.slice(0, 10).reverse()
    return recent.map((a, i) => ({
      x: i,
      y: a.total_marks > 0 ? (a.marks_earned / a.total_marks) * 100 : 0,
      attempt: a,
    }))
  }, [attempts])

  return (
    <section className="ms-grade-trajectory grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="ms-dash-card ms-grade-trajectory__chart h-full lg:col-span-3">
        <div className="mb-5 flex items-center gap-2">
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            ∴
          </span>
          <p className="ms-overline" style={{ marginBottom: 0 }}>
            Grade trajectory
          </p>
        </div>
        <h2 className="ms-h3">
          Your last {Math.max(series.length, 1)} attempt
          {series.length === 1 ? '' : 's'}
        </h2>
        <p className="ms-body-2 mt-1">
          {ibMode
            ? 'Percentages across your recent attempts.'
            : 'Percentages charted against Cambridge 9709 grade boundaries.'}
        </p>

        <div className="mt-6">
          <TrajectoryChart series={series} />
        </div>
      </div>

      <div className="lg:col-span-2">
        <PredictiveGradeCard prediction={prediction} ibMode={ibMode} targetGrade={targetGrade} />
      </div>
    </section>
  )
}

// ----------------------------- chart -----------------------------

type Point = {
  x: number
  y: number
  attempt: AttemptLite
}

function TrajectoryChart({ series }: { series: Point[] }) {
  const gradientId = useId()
  const width = 600
  const height = 260
  const padding = { top: 16, right: 56, bottom: 24, left: 32 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom

  // X scale: even spacing across the count. When only 0/1 points exist we
  // still want a non-degenerate axis, hence the `Math.max(1, ...)`.
  const xScale = (x: number) => {
    const n = Math.max(1, series.length - 1)
    return padding.left + (x / n) * plotW
  }
  const yScale = (y: number) =>
    padding.top + (1 - Math.min(100, Math.max(0, y)) / 100) * plotH

  const linePath =
    series.length > 1
      ? series
          .map(
            (p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.x)} ${yScale(p.y)}`
          )
          .join(' ')
      : ''

  // Smooth area fill — same path closed back to the baseline.
  const areaPath =
    series.length > 1
      ? `${linePath} L ${xScale(series[series.length - 1].x)} ${yScale(0)} L ${xScale(series[0].x)} ${yScale(0)} Z`
      : ''

  if (series.length === 0) {
    return (
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label="Grade trajectory placeholder"
        >
          <GradeBoundaryLines
            yScale={yScale}
            padding={padding}
            plotW={plotW}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <EmptyState
            stamp="∴"
            illustration="no-data"
            title="Your scores will appear here"
            body="Each marked answer becomes a point on this line. Grade boundaries (A* through E) are pre-drawn so you can see where you're tracking."
            ctaLabel="Mark your first question"
            ctaHref="/mark"
            inline
          />
        </div>
      </div>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Trajectory chart showing ${series.length} recent attempt scores`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ec-brand)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--ec-brand)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <GradeBoundaryLines yScale={yScale} padding={padding} plotW={plotW} />

      {/* y-axis baseline */}
      <line
        x1={padding.left}
        y1={padding.top + plotH}
        x2={padding.left + plotW}
        y2={padding.top + plotH}
        stroke="var(--ec-border)"
        strokeWidth="1"
      />

      {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke="var(--ec-brand)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {series.map((p) => (
        <g key={p.attempt.id}>
          <circle
            cx={xScale(p.x)}
            cy={yScale(p.y)}
            r="5"
            fill="var(--ec-paper, var(--ec-surface-raised))"
            stroke="var(--ec-brand)"
            strokeWidth="2.5"
          />
          <title>
            {new Date(p.attempt.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
            {' \u2014 '}
            {p.attempt.marks_earned}/{p.attempt.total_marks} ({Math.round(p.y)}%)
          </title>
        </g>
      ))}

      {/* x-axis label */}
      <text
        x={padding.left}
        y={padding.top + plotH + 18}
        fill="var(--ec-text-secondary)"
        fontSize="10"
        fontWeight={500}
      >
        Older
      </text>
      <text
        x={padding.left + plotW}
        y={padding.top + plotH + 18}
        textAnchor="end"
        fill="var(--ec-text-secondary)"
        fontSize="10"
        fontWeight={500}
      >
        Most recent
      </text>
    </svg>
  )
}

function GradeBoundaryLines({
  yScale,
  padding,
  plotW,
}: {
  yScale: (y: number) => number
  padding: { left: number; right: number; top: number; bottom: number }
  plotW: number
}) {
  return (
    <g>
      {GRADE_BOUNDARIES.map((b) => {
        const y = yScale(b.percentage)
        return (
          <g key={b.grade}>
            <line
              x1={padding.left}
              y1={y}
              x2={padding.left + plotW}
              y2={y}
              stroke={b.color}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity={0.5}
            />
            <text
              x={padding.left + plotW + 6}
              y={y + 3}
              fill={b.color}
              fontSize="10"
              fontWeight={700}
            >
              {b.grade}
            </text>
            <text
              x={padding.left - 6}
              y={y + 3}
              textAnchor="end"
              fill="var(--ec-text-secondary)"
              fontSize="9"
            >
              {b.percentage}
            </text>
          </g>
        )
      })}
    </g>
  )
}

// ----------------------------- prediction card -----------------------------

function PredictiveGradeCard({
  prediction,
  ibMode,
  targetGrade,
}: {
  prediction: GradePrediction
  ibMode: boolean
  targetGrade?: string | null
}) {
  const isPlaceholder = prediction.predictedGrade === '\u2014'
  const targetGap = gapToTargetGrade(prediction.averagePercentage, targetGrade ?? null)

  return (
    <div
      className="ms-dash-card relative h-full overflow-hidden"
      style={{
        borderColor: isPlaceholder
          ? undefined
          : `color-mix(in srgb, ${prediction.color} 45%, var(--ec-border))`,
        background: isPlaceholder
          ? undefined
          : `color-mix(in srgb, ${prediction.color} 8%, var(--ec-paper, var(--ec-surface)))`,
        boxShadow: isPlaceholder
          ? undefined
          : 'var(--ec-shadow-hard, 4px 4px 0 rgba(0, 0, 0, 0.1))',
      }}
    >

      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <span
            className="inline-grid h-5 min-w-5 place-items-center rounded border px-1 font-mono text-[10px] font-bold tracking-wide"
            style={{
              color: prediction.color,
              borderColor: `color-mix(in srgb, ${prediction.color} 45%, transparent)`,
              background: `color-mix(in srgb, ${prediction.color} 12%, transparent)`,
            }}
            aria-hidden
          >
            A*
          </span>
          <p
            className="ms-overline"
            style={{ marginBottom: 0, color: prediction.color }}
          >
            {ibMode ? 'IB grade (1–7)' : 'Grade estimate'}
          </p>
        </div>

        {!isPlaceholder && (
          <p className="ms-micro mb-2">Current trajectory</p>
        )}

        <div className="flex items-baseline gap-3">
          {ibMode ? (
            <span className="mt-2 inline-flex items-center rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))] px-3 py-1.5 font-mono text-xs font-semibold tracking-wide text-[var(--ec-text-secondary)]">
              1–7 estimate coming soon
            </span>
          ) : (
            <>
              <span
                className="ms-big-grade"
                style={{
                  color: isPlaceholder ? 'var(--ec-text-secondary)' : prediction.color,
                  fontSize: 'clamp(64px, 12vw, 84px)',
                }}
              >
                {prediction.predictedGrade}
              </span>
              {!isPlaceholder && (
                <span className="text-sm text-[var(--ec-text-secondary)]">
                  {prediction.confidence}% confidence
                </span>
              )}
            </>
          )}
        </div>

        {prediction.averagePercentage !== null && (
          <p className="mt-2 text-xs text-[var(--ec-text-secondary)]">
            {Math.round(prediction.averagePercentage)}% rolling average across
            your last attempts
          </p>
        )}

        {targetGrade && !isPlaceholder && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold ec-text-brand">
            <span
              className="inline-grid h-4 min-w-4 place-items-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-0.5 font-mono text-[9px] font-bold text-[var(--ec-brand)]"
              aria-hidden
            >
              ↑
            </span>
            {targetGap?.onTrack
              ? `On track for your target ${targetGrade}`
              : targetGap
                ? `Target ${targetGrade} · +${targetGap.pointsToGo}% to go`
                : `Target ${targetGrade}`}
          </p>
        )}

        {!isPlaceholder ? (
          <div className="ec-card ec-card--paper ec-highlight-success-panel mt-6 p-4">
            <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ec-text-brand">
              Path to next grade
            </div>
            <p className="text-sm leading-relaxed text-[var(--ec-text-secondary)]">
              {prediction.nextLevelTip}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            {prediction.nextLevelTip}
          </p>
        )}

        {!isPlaceholder && (
          <div className="mt-5">
            <ConfidenceBar
              confidence={prediction.confidence}
              color={prediction.color}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ConfidenceBar({
  confidence,
  color,
}: {
  confidence: number
  color: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ec-text-secondary)]">
        <span>Confidence</span>
        <span>{confidence}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-[2px] border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))]">
        <div
          className="h-full rounded-[1px] transition-all duration-700"
          style={{
            width: `${confidence}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  )
}
