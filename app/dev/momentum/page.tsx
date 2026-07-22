import { MomentumStrip } from '@/components/dashboard/MomentumStrip'
import { buildMomentum, type MomentumAttempt } from '@/lib/dashboard/momentum'

export const metadata = {
  title: 'Momentum strip — dev',
  robots: { index: false, follow: false },
}

/**
 * Visual harness for the dashboard momentum strip.
 *
 * The dashboard itself is auth-gated, so the only way to actually LOOK at this
 * component — rather than reason about it — is to render it against fixtures.
 * Mirrors the existing /dev/diagrams preview, and is noindex for the same reason.
 */

const NOW = new Date('2026-07-22T09:30:00Z')

function seed(spec: Array<[daysAgo: number, count: number, pct: number]>): MomentumAttempt[] {
  const out: MomentumAttempt[] = []
  for (const [daysAgo, count, pct] of spec) {
    const d = new Date(NOW)
    d.setUTCDate(d.getUTCDate() - daysAgo)
    for (let i = 0; i < count; i++) {
      out.push({
        created_at: d.toISOString(),
        marks_earned: Math.round((pct / 100) * 10),
        total_marks: 10,
      })
    }
  }
  return out
}

const CASES: Array<{ title: string; streak: number; attempts: MomentumAttempt[] }> = [
  {
    title: 'Consistent student, improving',
    streak: 6,
    attempts: seed([
      [0, 3, 82], [1, 2, 78], [2, 1, 74], [3, 2, 70], [4, 1, 66], [5, 2, 68],
      [8, 1, 55], [9, 2, 52], [11, 1, 48], [13, 1, 44],
      // Previous fortnight, used only for the delta.
      [16, 2, 45], [18, 1, 40], [21, 2, 38],
    ]),
  },
  {
    title: 'Broken streak, patchy weeks',
    streak: 0,
    attempts: seed([[4, 1, 60], [5, 2, 55], [10, 1, 71], [12, 3, 49]]),
  },
  {
    title: 'First day — single mark',
    streak: 1,
    attempts: seed([[0, 1, 60]]),
  },
]

export default function MomentumPreviewPage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-10">
      <h1 className="ms-h2 mb-2">Momentum strip</h1>
      <p className="ms-body-2 mb-8 text-[var(--ec-text-secondary)]">
        Fixture states. Dates are pinned to 2026-07-22 so the render is stable.
      </p>
      {CASES.map((c) => (
        <div key={c.title} className="mb-10">
          <p className="ec-eyebrow mb-3">{c.title}</p>
          <MomentumStrip
            summary={buildMomentum(c.attempts, 14, NOW)}
            streak={c.streak}
          />
        </div>
      ))}
      <div className="mb-10">
        <p className="ec-eyebrow mb-3">No activity — renders nothing</p>
        <MomentumStrip summary={buildMomentum([], 14, NOW)} streak={0} />
      </div>
    </div>
  )
}
