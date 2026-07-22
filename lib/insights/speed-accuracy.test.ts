import assert from 'node:assert/strict'
import {
  ACCURACY_THRESHOLD,
  buildSpeedAccuracy,
  quadrantOf,
} from '@/lib/insights/speed-accuracy'
import type { AttemptLite } from '@/lib/mastery'

function attempt(
  id: string,
  earned: number,
  total: number,
  seconds: number | null
): AttemptLite {
  return {
    id,
    marks_earned: earned,
    total_marks: total,
    syllabus_tags: null,
    created_at: '2026-07-20T10:00:00Z',
    time_spent_seconds: seconds,
  }
}

function main() {
  // Nothing timed → no points, no median, and crucially no dominant quadrant.
  // Inventing one would put a confident label under an empty chart.
  const none = buildSpeedAccuracy([attempt('a', 5, 10, null)])
  assert.equal(none.timedCount, 0)
  assert.equal(none.median, null)
  assert.equal(none.points.length, 0)
  assert.equal(none.dominant, null)

  // total_marks = 0 can't yield a percentage or a per-mark pace — excluded
  // rather than divided by zero.
  const zeroTotal = buildSpeedAccuracy([attempt('a', 0, 0, 120)])
  assert.equal(zeroTotal.timedCount, 0)

  // Median, not mean: one enormous attempt must not redefine "slow".
  // per-mark paces: 10, 20, 300 → median 20.
  const skewed = buildSpeedAccuracy([
    attempt('fast', 9, 10, 100), // 10 s/mark, 90%
    attempt('mid', 5, 10, 200), // 20 s/mark, 50%
    attempt('slow', 9, 10, 3000), // 300 s/mark, 90%
  ])
  assert.equal(skewed.median, 20)
  assert.equal(skewed.points.length, 3)

  const byId = new Map(skewed.points.map((p) => [p.id, p]))
  assert.equal(byId.get('fast')!.quadrant, 'master') // fast + accurate
  assert.equal(byId.get('slow')!.quadrant, 'perfectionist') // slow + accurate
  // 20 s/mark is exactly the median, which counts as fast (<=), and 50% is
  // below the accuracy threshold.
  assert.equal(byId.get('mid')!.quadrant, 'rushed')
  assert.equal(byId.get('fast')!.pct, 90)

  assert.deepEqual(skewed.counts, {
    master: 1,
    perfectionist: 1,
    rushed: 1,
    critical: 0,
  })

  // Boundary: exactly at the accuracy threshold counts as accurate.
  assert.equal(quadrantOf(5, ACCURACY_THRESHOLD, 10), 'master')
  assert.equal(quadrantOf(5, ACCURACY_THRESHOLD - 0.01, 10), 'rushed')
  // Boundary: exactly at the median counts as fast.
  assert.equal(quadrantOf(10, 90, 10), 'master')
  assert.equal(quadrantOf(10.01, 90, 10), 'perfectionist')

  // Over-100% (a reconciliation quirk) is clamped so a point can't escape the
  // plot area.
  const over = buildSpeedAccuracy([attempt('x', 12, 10, 100)])
  assert.equal(over.points[0].pct, 100)

  // Dominant is the modal quadrant.
  // Paces here are 100, 110, 120, 1 s/mark → median 105, so only the 110 and
  // 120 attempts are "slow". Note what this demonstrates: the split is against
  // the student's OWN median, so roughly half their attempts are always "fast"
  // by construction. The chart has to say that, or a student reads "fast" as
  // an objective statement about exam pace.
  const dominant = buildSpeedAccuracy([
    attempt('a', 2, 10, 1000),
    attempt('b', 2, 10, 1100),
    attempt('e', 2, 10, 1200),
    attempt('c', 9, 10, 10),
  ])
  assert.equal(dominant.median, 105)
  assert.equal(dominant.counts.critical, 2)
  assert.equal(dominant.counts.rushed, 1)
  assert.equal(dominant.counts.master, 1)
  assert.equal(dominant.dominant, 'critical')

  console.log('speed-accuracy.test.ts: ok')
}

main()
