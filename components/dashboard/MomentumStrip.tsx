import { Flame, TrendingDown, TrendingUp } from 'lucide-react'
import {
  weekdayInitial,
  type MomentumSummary,
} from '@/lib/dashboard/momentum'

/**
 * "Have I actually been showing up?" — answered as a picture.
 *
 * The dashboard home is where a study habit forms, and it carried no visual at
 * all: streak and weekly totals were sentences. Three stat tiles plus a column
 * per day makes the gaps visible, which is the part that changes behaviour.
 *
 * Form follows the job (dataviz method): a handful of headline numbers is a KPI
 * ROW of stat tiles, not a chart; daily counts over a fixed window are COLUMNS.
 * One series, so one hue — the brand green, stepped by opacity — with today in
 * full strength as emphasis. No legend: a single series is named by the title.
 */

function DeltaBadge({ delta }: { delta: number }) {
  const up = delta > 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span
      className={`ms-momentum-delta ${up ? 'is-up' : 'is-down'}`}
      title={`${up ? 'Up' : 'Down'} ${Math.abs(delta)} percentage points vs the previous fortnight`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {up ? '+' : ''}
      {delta} pts
    </span>
  )
}

export function MomentumStrip({
  summary,
  streak,
}: {
  summary: MomentumSummary
  streak: number
}) {
  const { days, peak, activeDays, avgPct, deltaPct } = summary
  const marksInWindow = days.reduce((sum, d) => sum + d.count, 0)

  // Nothing marked in the window: the strip would be a row of empty slots and
  // three zeroes, which reads as failure rather than as a fresh start.
  if (marksInWindow === 0) return null

  return (
    <section className="ms-momentum" aria-labelledby="momentum-heading">
      <h2 id="momentum-heading" className="sr-only">
        Your last two weeks
      </h2>

      <div className="ms-momentum-kpis">
        <div className="ms-momentum-kpi">
          <span className="ms-momentum-kpi__value">
            {streak > 0 && (
              <Flame
                className="ms-momentum-flame h-5 w-5"
                aria-hidden="true"
              />
            )}
            {streak}
          </span>
          <span className="ms-momentum-kpi__label">
            day{streak === 1 ? '' : 's'} in a row
          </span>
        </div>

        <div className="ms-momentum-kpi">
          <span className="ms-momentum-kpi__value">{marksInWindow}</span>
          <span className="ms-momentum-kpi__label">
            marks in {days.length} days
          </span>
        </div>

        {avgPct != null && (
          <div className="ms-momentum-kpi">
            <span className="ms-momentum-kpi__value">
              {avgPct}%
              {deltaPct != null && deltaPct !== 0 && (
                <DeltaBadge delta={deltaPct} />
              )}
            </span>
            <span className="ms-momentum-kpi__label">average score</span>
          </div>
        )}
      </div>

      <ol
        className="ms-momentum-bars"
        role="img"
        aria-label={`Marks per day over the last ${days.length} days: ${activeDays} active day${
          activeDays === 1 ? '' : 's'
        }, ${marksInWindow} marks in total.`}
      >
        {days.map((d) => {
          // Floor at a visible sliver so an active day never reads as empty,
          // and keep zero days as a bare track rather than a zero-height bar.
          const ratio = peak > 0 ? d.count / peak : 0
          const height = d.count === 0 ? 0 : Math.max(18, Math.round(ratio * 100))
          return (
            <li key={d.date} className="ms-momentum-bar">
              <span className="ms-momentum-bar__track" aria-hidden="true">
                {d.count > 0 && (
                  <span
                    className={`ms-momentum-bar__fill ${d.isToday ? 'is-today' : ''}`}
                    style={{ height: `${height}%` }}
                  />
                )}
              </span>
              <span
                className={`ms-momentum-bar__day ${d.isToday ? 'is-today' : ''}`}
                aria-hidden="true"
              >
                {weekdayInitial(d.date)}
              </span>
              {/* Per-day detail without a JS tooltip: title for pointer users,
                  and real text for screen readers. */}
              <span className="sr-only">
                {d.date}: {d.count} mark{d.count === 1 ? '' : 's'}
                {d.avgPct != null ? `, averaging ${Math.round(d.avgPct)}%` : ''}
              </span>
              <span className="ms-momentum-bar__hit" title={`${d.date} — ${d.count} mark${d.count === 1 ? '' : 's'}${d.avgPct != null ? ` · ${Math.round(d.avgPct)}%` : ''}`} />
            </li>
          )
        })}
      </ol>
    </section>
  )
}
