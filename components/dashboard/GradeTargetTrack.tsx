import Link from 'next/link'
import { CalendarDays, Flag } from 'lucide-react'
import type { GradeTarget } from '@/lib/dashboard/grade-target'

/**
 * Where you are, where you're aiming, and how long you've got.
 *
 * The three facts an exam student actually cares about were all stored and none
 * of them appeared together: recent average, target grade (settings-only until
 * now), and the exam date. This puts the student's dot on a grade track with a
 * flag at their target and the countdown beside it.
 *
 * Form: a single value against a target on an ORDERED scale — a meter, not a
 * chart. One hue for the fill, an outlined flag for the target, and the gap
 * spelled out in words. Grade colours from GRADE_BOUNDARIES are deliberately
 * NOT used for the fill: a B is not a "warning" state, and borrowing the status
 * palette here would make the same colour mean two different things.
 *
 * The honesty constraints are the interesting part. IB numeric targets have no
 * Cambridge percentage boundary, so the flag is omitted rather than invented; a
 * small sample is labelled as such; and a past exam date is treated as stale
 * profile data rather than shown as a negative countdown.
 */

/** The track spans E (30%) to just past A* (80%) — below E the scale carries no
 * information a student can act on, and the whole 0–100 range wastes the space
 * where every real average sits. */
const TRACK_MIN = 25
const TRACK_MAX = 95
const pos = (pct: number) =>
  Math.max(0, Math.min(100, ((pct - TRACK_MIN) / (TRACK_MAX - TRACK_MIN)) * 100))

export function GradeTargetTrack({ data }: { data: GradeTarget }) {
  const {
    averagePct,
    currentGrade,
    targetGrade,
    targetPct,
    pointsToGo,
    onTrack,
    daysToExam,
    sampleSize,
    bands,
  } = data

  const headline = !targetGrade
    ? `You're averaging ${averagePct}% — a ${currentGrade}.`
    : onTrack
      ? `You're at ${currentGrade} — on track for your ${targetGrade}.`
      : pointsToGo != null
        ? `${pointsToGo} point${pointsToGo === 1 ? '' : 's'} from your ${targetGrade}.`
        : `Aiming for ${targetGrade}. You're averaging ${averagePct}%.`

  return (
    <section className="ms-grade-target" aria-labelledby="grade-target-h">
      <div className="ms-grade-target__head">
        <div>
          <p className="ms-overline" style={{ marginBottom: 4 }}>
            Your grade
          </p>
          <h2 id="grade-target-h" className="ms-grade-target__headline">
            {headline}
          </h2>
          <p className="ms-grade-target__sub">
            Recent form across your last {sampleSize} mark
            {sampleSize === 1 ? '' : 's'}
            {sampleSize < 3 ? ' — still early, so treat it loosely' : ''}.
          </p>
        </div>

        {daysToExam != null && (
          <div className="ms-grade-target__countdown">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            <span className="ms-grade-target__days">{daysToExam}</span>
            <span className="ms-grade-target__days-label">
              day{daysToExam === 1 ? '' : 's'} to your exam
            </span>
          </div>
        )}
      </div>

      <div
        className="ms-grade-track"
        role="img"
        aria-label={`You are averaging ${averagePct} percent, a grade ${currentGrade}.${
          targetGrade ? ` Your target is ${targetGrade}.` : ''
        }${
          pointsToGo ? ` ${pointsToGo} percentage points to go.` : ''
        }`}
      >
        <div className="ms-grade-track__rail">
          <div
            className="ms-grade-track__fill"
            style={{ width: `${pos(averagePct)}%` }}
          />

          {/* Boundary ticks, labelled — the ordinal scale needs naming or the
              bar is just a percentage with extra steps. */}
          {bands.map((b) => (
            <span
              key={b.grade}
              className="ms-grade-track__tick"
              style={{ left: `${pos(b.percentage)}%` }}
            >
              <span className="ms-grade-track__tick-line" aria-hidden="true" />
              <span className="ms-grade-track__tick-label">{b.grade}</span>
            </span>
          ))}

          {targetPct != null && (
            <span
              className="ms-grade-track__target"
              style={{ left: `${pos(targetPct)}%` }}
              title={`Target: ${targetGrade}`}
            >
              <Flag className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          )}

          <span
            className="ms-grade-track__you"
            style={{ left: `${pos(averagePct)}%` }}
          >
            <span className="ms-grade-track__you-dot" aria-hidden="true" />
            <span className="ms-grade-track__you-label">{averagePct}%</span>
          </span>
        </div>
      </div>

      {!targetGrade && (
        <p className="ms-grade-target__cta">
          <Link href="/account/study" className="ec-link font-semibold">
            Set a target grade
          </Link>{' '}
          and this shows exactly how far you have to go.
        </p>
      )}
    </section>
  )
}
