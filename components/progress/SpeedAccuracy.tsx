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
            <Gauge className="h-4 w-4 text-[var(--ec-chip-info-text)]" aria-hidden="true" />
            <p className="ec-label-tech ec-label-tech-cyan">SPEED VS ACCURACY</p>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--ec-text-primary)] sm:text-3xl">
            How efficient are you under pressure?
          </h2>
          <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">
            Each attempt is plotted by time-per-mark and accuracy.
            {median !== null && (
              <>
                {' '}
                Median pace: <span className="font-mono font-semibold text-[var(--ec-chip-info-text)]">
                  {formatPerMark(median)}
                </span>{' '}
                per mark.
              </>
            )}
          </p>
        </div>
        {hasTimedData && (
          <div className="hidden items-center gap-1.5 rounded-full border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] px-3 py-1.5 font-mono text-xs font-semibold text-[var(--ec-text-secondary)] sm:inline-flex">
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
      ring: 'border',
      badge: 'ec-tint-success-chip',
      icon: 'ec-tint-success-icon',
      tone: 'hover:shadow-[0_10px_40px_color-mix(in_srgb,var(--ec-chip-success-text)_18%,transparent)]',
    },
    amber: {
      ring: 'border',
      badge: 'ec-tint-warning-chip',
      icon: 'ec-tint-warning-icon',
      tone: 'hover:shadow-[0_10px_40px_color-mix(in_srgb,var(--ec-chip-warning-text)_18%,transparent)]',
    },
    orange: {
      ring: 'border',
      badge: 'ec-tint-warning-chip',
      icon: 'ec-tint-warning-icon',
      tone: 'hover:shadow-[0_10px_40px_color-mix(in_srgb,var(--ec-chip-warning-text)_18%,transparent)]',
    },
    red: {
      ring: 'border',
      badge: 'ec-tint-critical-chip',
      icon: 'ec-tint-critical-icon',
      tone: 'hover:shadow-[0_10px_40px_color-mix(in_srgb,var(--ec-chip-critical-text)_18%,transparent)]',
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
            <h3 className="text-base font-bold tracking-tight text-[var(--ec-text-primary)]">
              {title}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.badge}`}
            >
              {count}
            </span>
          </div>
          <p className="text-xs font-medium text-[var(--ec-text-secondary)]">{subtitle}</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
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
