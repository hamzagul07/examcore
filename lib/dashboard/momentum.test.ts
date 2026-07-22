import assert from 'node:assert/strict'
import { buildMomentum, weekdayInitial } from '@/lib/dashboard/momentum'

const NOW = new Date('2026-07-22T09:30:00Z')

function at(day: string, earned: number, total: number) {
  return { created_at: `${day}T12:00:00Z`, marks_earned: earned, total_marks: total }
}

function main() {
  // Empty history still yields a full window of empty days — the gaps are the
  // point of the strip, so it must never collapse to the days that have data.
  const empty = buildMomentum([], 14, NOW)
  assert.equal(empty.days.length, 14)
  assert.equal(empty.days[13].date, '2026-07-22')
  assert.equal(empty.days[0].date, '2026-07-09')
  assert.equal(empty.peak, 0)
  assert.equal(empty.activeDays, 0)
  assert.equal(empty.avgPct, null)
  assert.equal(empty.deltaPct, null, 'no data must not imply a trend')

  const m = buildMomentum(
    [
      at('2026-07-22', 8, 10), // today
      at('2026-07-22', 6, 10),
      at('2026-07-21', 5, 10),
      at('2026-07-09', 10, 10), // first day of the window
      at('2026-07-08', 2, 10), // previous window
      at('2026-06-01', 10, 10), // far outside both
    ],
    14,
    NOW
  )

  const today = m.days[13]
  assert.equal(today.isToday, true)
  assert.equal(today.count, 2)
  assert.equal(today.avgPct, 70, 'mean of 80% and 60%')
  assert.equal(m.days[12].count, 1)
  assert.equal(m.days[0].count, 1, 'window is inclusive of its first day')
  assert.equal(m.peak, 2)
  assert.equal(m.activeDays, 3)

  // Window mean = 80, 60, 50, 100 → 72.5 → 73. Previous window has only the
  // 20% attempt, so the delta is +53. The far-outside attempt is excluded from
  // both, which is what keeps the delta honest.
  assert.equal(m.avgPct, 73)
  assert.equal(m.deltaPct, 53)

  // A day with attempts but no usable denominator counts as activity without
  // inventing a score — total_marks = 0 must not become a 0% day.
  const zeroTotal = buildMomentum(
    [{ created_at: '2026-07-22T10:00:00Z', marks_earned: 0, total_marks: 0 }],
    14,
    NOW
  )
  assert.equal(zeroTotal.days[13].count, 1)
  assert.equal(zeroTotal.days[13].avgPct, null)
  assert.equal(zeroTotal.avgPct, null)

  // Malformed timestamps are skipped rather than throwing or landing on a
  // bogus day.
  const bad = buildMomentum(
    [{ created_at: 'not-a-date', marks_earned: 5, total_marks: 10 }],
    14,
    NOW
  )
  assert.equal(bad.activeDays, 0)

  // 2026-07-22 is a Wednesday.
  assert.equal(weekdayInitial('2026-07-22'), 'W')

  console.log('momentum.test.ts: ok')
}

main()
