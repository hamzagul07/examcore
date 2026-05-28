import {
  Crown,
  Hourglass,
  Rabbit,
  AlertTriangle,
  Gauge,
  Clock,
} from 'lucide-react'
import { EmptyState } from './EmptyState'
import type { AttemptLite } from '@/lib/mastery'
import { TiltCard } from '@/components/effects/TiltCard'

type Props = {
  attempts: AttemptLite[]
}

type Quadrant =
  | 'master' // fast + accurate
  | 'perfectionist' // slow + accurate
  | 'rushed' // fast + inaccurate
  | 'critical' // slow + inaccurate

interface QuadrantBucket {
  attempts: AttemptLite[]
}

const ACCURACY_THRESHOLD = 75 // %

export function SpeedAccuracy({ attempts }: Props) {
  const timed = attempts.filter(
    (a) =>
      typeof a.time_spent_seconds === 'number' &&
      a.time_spent_seconds! > 0 &&
      a.total_marks > 0
  )

  // Median time-per-mark splits fast vs slow. Median (not mean) so an outlier
  // doesn't tank the whole division.
  const median = computeMedianTimePerMark(timed)

  const buckets: Record<Quadrant, QuadrantBucket> = {
    master: { attempts: [] },
    perfectionist: { attempts: [] },
    rushed: { attempts: [] },
    critical: { attempts: [] },
  }

  if (median !== null) {
    for (const a of timed) {
      const tpm = a.time_spent_seconds! / a.total_marks
      const pct = (a.marks_earned / a.total_marks) * 100
      const fast = tpm <= median
      const accurate = pct >= ACCURACY_THRESHOLD
      if (fast && accurate) buckets.master.attempts.push(a)
      else if (!fast && accurate) buckets.perfectionist.attempts.push(a)
      else if (fast && !accurate) buckets.rushed.attempts.push(a)
      else buckets.critical.attempts.push(a)
    }
  }

  const hasTimedData = timed.length > 0

  return (
    <section className="ec-card-premium p-5 sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            <p className="ec-label-tech ec-label-tech-cyan">SPEED VS ACCURACY</p>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            How efficient are you under pressure?
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Each attempt is plotted by time-per-mark and accuracy.
            {median !== null && (
              <>
                {' '}
                Median pace: <span className="font-mono font-semibold text-cyan-400">
                  {formatPerMark(median)}
                </span>{' '}
                per mark.
              </>
            )}
          </p>
        </div>
        {hasTimedData && (
          <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-dark-900/60 px-3 py-1.5 font-mono text-xs font-semibold text-slate-400 sm:inline-flex">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {timed.length} timed attempt{timed.length === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {!hasTimedData && (
        <div className="mb-6">
          <EmptyState
            icon={Clock}
            illustration="loading"
            title="Time tracking starts now"
            body="Earlier attempts don't have timing data. The next questions you mark will time themselves automatically and your efficiency profile will fill the four quadrants below."
            inline
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <QuadrantCard
          quadrant="master"
          icon={Crown}
          title="The Master"
          subtitle="Fast & accurate"
          message="You\u2019re solving these the way exam-day expects: confident and quick."
          accent="emerald"
          count={buckets.master.attempts.length}
          hasData={hasTimedData}
        />
        <QuadrantCard
          quadrant="perfectionist"
          icon={Hourglass}
          title="The Perfectionist"
          subtitle="Slow & accurate"
          message="You get there, but exam time pressure could catch you out. Drill for speed."
          accent="amber"
          count={buckets.perfectionist.attempts.length}
          hasData={hasTimedData}
        />
        <QuadrantCard
          quadrant="rushed"
          icon={Rabbit}
          title="The Rushed"
          subtitle="Fast & inaccurate"
          message="Slow down. Show working. Easy marks are leaking out from haste."
          accent="orange"
          count={buckets.rushed.attempts.length}
          hasData={hasTimedData}
        />
        <QuadrantCard
          quadrant="critical"
          icon={AlertTriangle}
          title="Critical Review"
          subtitle="Slow & inaccurate"
          message="These are foundation gaps, not speed issues. Revisit the topic before drilling more questions."
          accent="red"
          count={buckets.critical.attempts.length}
          hasData={hasTimedData}
        />
      </div>
    </section>
  )
}

// ----------------------------- pieces -----------------------------

function QuadrantCard({
  icon: Icon,
  title,
  subtitle,
  message,
  accent,
  count,
  hasData,
}: {
  quadrant: Quadrant
  icon: typeof Crown
  title: string
  subtitle: string
  message: string
  accent: 'emerald' | 'amber' | 'orange' | 'red'
  count: number
  hasData: boolean
}) {
  const accents: Record<
    typeof accent,
    { ring: string; badge: string; icon: string; tone: string }
  > = {
    emerald: {
      ring: 'border-emerald-500/30',
      badge: 'bg-emerald-950 text-emerald-400 border-emerald-900',
      icon: 'text-emerald-400 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.3)]',
      tone: 'hover:shadow-[0_10px_40px_rgba(16,185,129,0.18)]',
    },
    amber: {
      ring: 'border-amber-500/30',
      badge: 'bg-amber-950 text-amber-400 border-amber-900',
      icon: 'text-amber-400 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.3)]',
      tone: 'hover:shadow-[0_10px_40px_rgba(245,158,11,0.18)]',
    },
    orange: {
      ring: 'border-orange-500/30',
      badge: 'bg-orange-950 text-orange-400 border-orange-900',
      icon: 'text-orange-400 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.3)]',
      tone: 'hover:shadow-[0_10px_40px_rgba(249,115,22,0.18)]',
    },
    red: {
      ring: 'border-red-500/30',
      badge: 'bg-red-950 text-red-400 border-red-900',
      icon: 'text-red-400 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.3)]',
      tone: 'hover:shadow-[0_10px_40px_rgba(239,68,68,0.18)]',
    },
  }
  const t = accents[accent]
  const isEmpty = !hasData || count === 0

  return (
    <TiltCard intensity={4} glow={!isEmpty} className="h-full rounded-3xl">
      <div
        className={`ec-card relative h-full overflow-hidden p-5 transition-shadow duration-300 ${t.tone} ${isEmpty ? 'opacity-60' : ''}`}
      >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${t.icon} ${t.ring}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold tracking-tight text-white">
              {title}
            </h3>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${t.badge}`}
            >
              {count}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">{subtitle}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {message}
          </p>
        </div>
      </div>
      </div>
    </TiltCard>
  )
}

function computeMedianTimePerMark(timed: AttemptLite[]): number | null {
  if (timed.length === 0) return null
  const perMark = timed
    .map((a) => a.time_spent_seconds! / a.total_marks)
    .sort((a, b) => a - b)
  const mid = Math.floor(perMark.length / 2)
  if (perMark.length % 2 === 0) {
    return (perMark[mid - 1] + perMark[mid]) / 2
  }
  return perMark[mid]
}

function formatPerMark(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = seconds / 60
  if (minutes < 10) return `${minutes.toFixed(1)} min`
  return `${Math.round(minutes)} min`
}
