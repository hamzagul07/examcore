'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Route, Flag, Trophy, Star, MapPin, CircleDot } from 'lucide-react'
import type { TimelineStation, StationKind } from '@/lib/insights/types'

type Props = {
  stations: TimelineStation[]
  subjectLabel: string
}

type ViewMode = 'story' | 'detailed'

const MAJOR_META: Record<
  StationKind,
  { tint: string }
> = {
  first_mark: { tint: '#38bdf8' },
  attempt: { tint: 'var(--ec-brand)' },
  milestone: { tint: '#a855f7' },
  streak: { tint: '#f97316' },
  exam_ready: { tint: 'var(--ec-chip-success-text)' },
  best: { tint: '#f59e0b' },
  latest: { tint: 'var(--ec-brand)' },
}

function stationIcon(kind: StationKind) {
  switch (kind) {
    case 'first_mark':
      return Flag
    case 'best':
      return Trophy
    case 'milestone':
      return Star
    case 'latest':
      return MapPin
    default:
      return CircleDot
  }
}

export function JourneyTimeline({ stations, subjectLabel }: Props) {
  const reduce = useReducedMotion()
  const [view, setView] = useState<ViewMode>('story')
  const [vertical, setVertical] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 640px)')
    const apply = () => setVertical(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const shown = useMemo(() => {
    if (view === 'detailed') return stations
    const majors = stations.filter((s) => s.major)
    return majors.length >= 2 ? majors : stations
  }, [stations, view])

  if (stations.length === 0) {
    return (
      <section className="ec-card p-6 sm:p-8">
        <Header subjectLabel={subjectLabel} view={view} setView={setView} disabled />
        <div className="rounded-2xl border border-dashed border-[var(--ec-border)] bg-[var(--ec-surface)] p-10 text-center">
          <Route className="mx-auto mb-3 h-8 w-8 text-[var(--ec-text-secondary)]" aria-hidden="true" />
          <p className="text-sm font-semibold text-[var(--ec-text-primary)]">
            Your journey starts with your first question
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            Every question you mark becomes a stop on this line. Mark one and watch the map grow.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="ec-card min-w-0 p-5 sm:p-8">
      <Header subjectLabel={subjectLabel} view={view} setView={setView} />
      {vertical ? (
        <VerticalMetro stations={shown} reduce={!!reduce} />
      ) : (
        <HorizontalMetro stations={shown} reduce={!!reduce} />
      )}
    </section>
  )
}

function Header({
  subjectLabel,
  view,
  setView,
  disabled,
}: {
  subjectLabel: string
  view: ViewMode
  setView: (v: ViewMode) => void
  disabled?: boolean
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Route className="h-4 w-4 text-[var(--ec-brand)]" aria-hidden="true" />
          <p className="ec-label-tech">YOUR JOURNEY</p>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--ec-text-primary)] sm:text-3xl">
          The map of your {subjectLabel} progress
        </h2>
      </div>
      {!disabled && (
        <div
          role="tablist"
          aria-label="Timeline detail"
          className="inline-flex shrink-0 rounded-xl border border-[var(--ec-border)] bg-[var(--ec-surface)] p-1"
        >
          {(['story', 'detailed'] as ViewMode[]).map((v) => (
            <button
              key={v}
              role="tab"
              type="button"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={[
                'min-h-[44px] rounded-lg px-3 py-2 text-xs font-semibold capitalize transition-colors',
                view === v
                  ? 'bg-[var(--ec-brand-muted)] text-[var(--ec-brand)]'
                  : 'text-[var(--ec-text-secondary)] hover:text-[var(--ec-text-primary)]',
              ].join(' ')}
            >
              {v === 'story' ? 'Story' : 'Every mark'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// --------------------------- horizontal (desktop) ---------------------------

function HorizontalMetro({
  stations,
  reduce,
}: {
  stations: TimelineStation[]
  reduce: boolean
}) {
  const gradientId = useId()
  const [hovered, setHovered] = useState<string | null>(null)

  const n = stations.length
  const step = 132
  const padding = { top: 40, right: 56, bottom: 48, left: 56 }
  const plotW = Math.max((n - 1) * step, step)
  const plotH = 200
  const width = plotW + padding.left + padding.right
  const height = plotH + padding.top + padding.bottom

  const xy = (s: TimelineStation, i: number) => {
    const x = padding.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)
    const score = s.score ?? 50
    const y = padding.top + (1 - Math.min(100, Math.max(0, score)) / 100) * plotH
    return { x, y }
  }

  const points = stations.map((s, i) => ({ s, ...xy(s, i) }))
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')

  return (
    <div className="relative min-w-0 overflow-x-auto">
      <div className="relative min-w-full" style={{ width }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Journey timeline with ${n} stations`}
          style={{ minWidth: width }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="var(--ec-brand)" />
            </linearGradient>
          </defs>

          {/* base rail */}
          <path
            d={linePath}
            fill="none"
            stroke="var(--ec-border)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* drawn line */}
          <motion.path
            d={linePath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 6px var(--ec-brand-muted))' }}
            initial={reduce ? { opacity: 0 } : { pathLength: 0 }}
            animate={reduce ? { opacity: 1 } : { pathLength: 1 }}
            transition={{ duration: reduce ? 0.4 : 1.4, ease: 'easeInOut' }}
          />

          {points.map((p, i) => {
            const tint = MAJOR_META[p.s.kind].tint
            const r = p.s.major ? 9 : 5
            return (
              <motion.g
                key={p.s.id}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: reduce ? 0 : 0.4 + (i / Math.max(1, n)) * 1.1,
                  duration: 0.3,
                }}
                style={{ transformOrigin: `${p.x}px ${p.y}px`, cursor: 'pointer' }}
                onMouseEnter={() => setHovered(p.s.id)}
                onMouseLeave={() => setHovered(null)}
                tabIndex={0}
                onFocus={() => setHovered(p.s.id)}
                onBlur={() => setHovered(null)}
              >
                <circle cx={p.x} cy={p.y} r={r + 5} fill="var(--ec-canvas)" />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill="var(--ec-surface-raised)"
                  stroke={tint}
                  strokeWidth={p.s.major ? 3.5 : 2.5}
                />
                {p.s.major && (
                  <text
                    x={p.x}
                    y={p.y - 18}
                    textAnchor="middle"
                    className="fill-[var(--ec-text-primary)]"
                    fontSize="11"
                    fontWeight={700}
                  >
                    {p.s.label}
                  </text>
                )}
                <title>{`${p.s.label} — ${p.s.detail ?? ''}`}</title>
              </motion.g>
            )
          })}
        </svg>

        {/* hover tooltip overlay (percentage-positioned to match the scaled SVG) */}
        {points.map((p) => {
          if (hovered !== p.s.id) return null
          const Icon = stationIcon(p.s.kind)
          return (
            <div
              key={`tip-${p.s.id}`}
              className="pointer-events-none absolute z-10 -translate-x-1/2 translate-y-2"
              style={{ left: `${(p.x / width) * 100}%`, top: `${(p.y / height) * 100}%` }}
            >
              <div className="ec-card flex items-center gap-2 whitespace-nowrap px-3 py-2 text-xs shadow-[var(--ec-card-hover-shadow)]">
                <Icon className="h-3.5 w-3.5 text-[var(--ec-brand)]" aria-hidden="true" />
                <span className="font-semibold text-[var(--ec-text-primary)]">{p.s.label}</span>
                {p.s.detail && (
                  <span className="font-mono text-[var(--ec-text-secondary)]">{p.s.detail}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --------------------------- vertical (mobile) ---------------------------

function VerticalMetro({
  stations,
  reduce,
}: {
  stations: TimelineStation[]
  reduce: boolean
}) {
  return (
    <ol className="relative ml-2 space-y-1">
      <span
        className="absolute left-[11px] top-2 bottom-2 w-[3px] rounded-full"
        style={{ background: 'linear-gradient(var(--ec-brand), #38bdf8)' }}
        aria-hidden="true"
      />
      {stations.map((s, i) => {
        const tint = MAJOR_META[s.kind].tint
        const Icon = stationIcon(s.kind)
        return (
          <motion.li
            key={s.id}
            className="relative flex items-start gap-3 py-2 pl-8"
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
            transition={{ delay: reduce ? 0 : i * 0.05, duration: 0.3 }}
          >
            <span
              className="absolute left-0 top-3 flex items-center justify-center rounded-full border-[3px] bg-[var(--ec-surface-raised)]"
              style={{
                width: s.major ? 26 : 20,
                height: s.major ? 26 : 20,
                borderColor: tint,
                marginLeft: s.major ? -1 : 2,
              }}
            >
              {s.major && <Icon className="h-3 w-3" style={{ color: tint }} aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--ec-text-primary)]">{s.label}</p>
              {s.detail && (
                <p className="font-mono text-xs text-[var(--ec-text-secondary)]">{s.detail}</p>
              )}
            </div>
          </motion.li>
        )
      })}
    </ol>
  )
}
