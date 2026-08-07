import assert from 'node:assert/strict'
import { computeLongestStreak, countRecentAttempts } from '@/lib/dashboard/streak'

/** Days back from today, at midday UTC so no boundary rounding is involved. */
function daysAgo(n: number): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  d.setUTCHours(12, 0, 0, 0)
  return d
}

// --- computeLongestStreak ---------------------------------------------------

assert.equal(computeLongestStreak([]), 0, 'no attempts → no streak')
assert.equal(computeLongestStreak([daysAgo(0)]), 1, 'a single day is a run of 1')

assert.equal(
  computeLongestStreak([daysAgo(4), daysAgo(3), daysAgo(2)]),
  3,
  'three consecutive days'
)

// Several attempts on one day must not inflate the run.
assert.equal(
  computeLongestStreak([daysAgo(2), daysAgo(2), daysAgo(2), daysAgo(1)]),
  2,
  'same-day attempts collapse to one day'
)

// The best run is not necessarily the most recent one.
assert.equal(
  computeLongestStreak([
    daysAgo(10),
    daysAgo(9),
    daysAgo(8),
    daysAgo(7), // run of 4
    daysAgo(2),
    daysAgo(1), // run of 2, more recent
  ]),
  4,
  'longest run wins over most recent run'
)

// Unsorted input must give the same answer as sorted.
assert.equal(
  computeLongestStreak([daysAgo(1), daysAgo(3), daysAgo(2), daysAgo(9)]),
  3,
  'input order does not matter'
)

// A gap of one day breaks the run — no grace period here, unlike computeStreak.
assert.equal(
  computeLongestStreak([daysAgo(5), daysAgo(4), daysAgo(2), daysAgo(1)]),
  2,
  'a one-day gap splits the run'
)

// Spanning a month boundary must not break the run.
const monthEdge = [new Date('2026-01-30T12:00:00Z'), new Date('2026-01-31T12:00:00Z'), new Date('2026-02-01T12:00:00Z')]
assert.equal(computeLongestStreak(monthEdge), 3, 'run survives a month boundary')

// --- countRecentAttempts ----------------------------------------------------

assert.equal(countRecentAttempts([], 7), 0, 'no attempts → zero')

assert.equal(
  countRecentAttempts([daysAgo(0), daysAgo(0), daysAgo(3)], 7),
  3,
  'counts attempts, not days'
)

assert.equal(
  countRecentAttempts([daysAgo(6), daysAgo(7), daysAgo(30)], 7),
  1,
  'a 7-day window includes today and excludes day 7'
)

console.log('streak tests passed')
