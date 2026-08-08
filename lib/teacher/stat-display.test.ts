import assert from 'node:assert/strict'
import {
  NO_DATA,
  attemptSummary,
  hasMarkedWork,
  percentOrDash,
} from '@/lib/teacher/stat-display'

// --- the distinction the whole module exists for --------------------------------

// A student who has not submitted anything does not score 0%. Showing "0% avg"
// beside their name reads as a child who is failing rather than one who has not
// started, which is the sort of thing a teacher acts on.
assert.equal(percentOrDash(0, 0), NO_DATA, 'no attempts means no average')
assert.equal(percentOrDash(0, 3), '0%', 'but a real zero is still a real zero')

assert.equal(attemptSummary(0, 0), 'Not started')
assert.equal(attemptSummary(0, 85), 'Not started', 'no attempts wins over any stored score')
assert.equal(attemptSummary(3, 72), '3 attempts · 72% avg')
assert.equal(attemptSummary(1, 50), '1 attempt · 50% avg', 'singular reads properly')

// --- rounding and edges ------------------------------------------------------------

assert.equal(percentOrDash(72.4, 2), '72%')
assert.equal(percentOrDash(72.5, 2), '73%')
assert.equal(percentOrDash(100, 1), '100%')

// Missing or nonsense inputs produce a dash, never NaN% on a teacher's screen.
assert.equal(percentOrDash(null, 5), NO_DATA)
assert.equal(percentOrDash(undefined, 5), NO_DATA)
assert.equal(percentOrDash(Number.NaN, 5), NO_DATA)
assert.equal(percentOrDash(50, Number.NaN), NO_DATA)
assert.equal(percentOrDash(50, -1), NO_DATA, 'a negative count is not evidence')

// --- hasMarkedWork ------------------------------------------------------------------

assert.equal(hasMarkedWork(0), false)
assert.equal(hasMarkedWork(1), true)
assert.equal(hasMarkedWork(null), false)
assert.equal(hasMarkedWork(undefined), false)
assert.equal(hasMarkedWork(Number.NaN), false)

console.log('stat-display.test.ts — all assertions passed')
