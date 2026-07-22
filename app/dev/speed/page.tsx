import { SpeedAccuracyChart } from '@/components/progress/insights/SpeedAccuracyChart'
import { buildSpeedAccuracy } from '@/lib/insights/speed-accuracy'
import type { AttemptLite } from '@/lib/mastery'

export const metadata = {
  title: 'Speed vs accuracy — dev',
  robots: { index: false, follow: false },
}

/**
 * Visual harness for the speed-vs-accuracy scatter. /dashboard/progress is
 * auth-gated, so fixtures are the only way to look at this rather than reason
 * about it. Mirrors /dev/diagrams, /dev/momentum and /dev/mastery.
 */

let seq = 0
function a(pct: number, secondsPerMark: number, daysAgo = seq): AttemptLite {
  const total = 10
  const d = new Date('2026-07-22T09:00:00Z')
  d.setUTCDate(d.getUTCDate() - daysAgo)
  seq += 1
  return {
    id: `a${seq}`,
    marks_earned: Math.round((pct / 100) * total),
    total_marks: total,
    syllabus_tags: null,
    created_at: d.toISOString(),
    time_spent_seconds: Math.round(secondsPerMark * total),
  }
}

const CASES: Array<{ title: string; attempts: AttemptLite[] }> = [
  {
    title: 'Spread across all four quadrants',
    attempts: [
      a(92, 22), a(88, 26), a(84, 30), a(78, 19),
      a(62, 24), a(55, 18), a(48, 21), a(41, 15),
      a(90, 62), a(83, 71), a(76, 55),
      a(58, 68), a(44, 80), a(35, 74), a(66, 90),
    ],
  },
  {
    title: 'Mostly rushing — fast but leaking marks',
    attempts: [
      a(46, 11), a(52, 9), a(39, 13), a(58, 10), a(44, 12),
      a(61, 14), a(88, 26), a(70, 30), a(35, 8),
    ],
  },
  {
    title: 'Only two timed attempts — renders nothing',
    attempts: [a(70, 20), a(60, 30)],
  },
]

export default function SpeedPreviewPage() {
  return (
    <div className="mx-auto max-w-[820px] px-4 py-10">
      <h1 className="ms-h2 mb-2">Speed vs accuracy</h1>
      <p className="ms-body-2 mb-8 text-[var(--ec-text-secondary)]">
        Fixture states. Hover a dot for its tooltip.
      </p>
      {CASES.map((c) => (
        <div key={c.title} className="mb-10">
          <p className="ec-eyebrow mb-3">{c.title}</p>
          <SpeedAccuracyChart data={buildSpeedAccuracy(c.attempts)} />
        </div>
      ))}
    </div>
  )
}
