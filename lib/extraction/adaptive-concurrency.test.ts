import assert from 'node:assert/strict'
import { AdaptiveConcurrency } from './adaptive-concurrency'

// The clock is driven by hand rather than read from Date.now(). With a 1ms
// window and a real clock, a hundred recordApiOutcome calls finished inside the
// same millisecond, so maybeAdjust() returned early every time and the throttle
// never fired — this test failed on fast machines and passed on slow ones, and
// nothing noticed because CI never ran it.
let clock = 0
const ac = new AdaptiveConcurrency(6, {
  min: 2,
  max: 15,
  adjustIntervalMs: 1,
  now: () => clock,
})

assert.equal(ac.value, 6)

for (let i = 0; i < 20; i++) ac.recordApiOutcome(true)
for (let i = 0; i < 80; i++) ac.recordApiOutcome(false)

// Nothing adjusts while the window is still open; advancing past it is what
// lets the accumulated 20/100 rate be judged.
clock = 5
assert.equal(ac.value, 5, 'throttles down when 429 rate exceeds 10%')

let floorClock = 0
const floor = new AdaptiveConcurrency(2, {
  min: 2,
  adjustIntervalMs: 1,
  now: () => floorClock,
})
for (let i = 0; i < 50; i++) floor.recordApiOutcome(true)
floorClock = 5
assert.equal(floor.value, 2, 'never drops below floor of 2')

console.log('adaptive-concurrency.test.ts: ok')
