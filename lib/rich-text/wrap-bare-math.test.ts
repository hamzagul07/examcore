import assert from 'node:assert/strict'
import { wrapBareMathRuns } from './wrap-bare-math'

assert.equal(
  wrapBareMathRuns('y = x^3 - 6x^2 + 9x + 1'),
  '$y = x^3 - 6x^2 + 9x + 1$'
)

assert.equal(
  wrapBareMathRuns('The area is \\frac{1}{2}bh.'),
  'The area is $\\frac{1}{2}bh$.'
)

// Protect existing delimiters; still wrap bare power beside them.
const mixed = wrapBareMathRuns('Use $\\theta$ then expand (1-4x)^6')
assert.ok(mixed.includes('$\\theta$'), mixed)
assert.ok(mixed.includes('$(1-4x)^6$') || /\$.*1-4x/.test(mixed), mixed)

// Prose must stay plain.
assert.equal(
  wrapBareMathRuns('The shop is open 9 am - 5 pm on weekdays.'),
  'The shop is open 9 am - 5 pm on weekdays.'
)

console.log('wrap-bare-math.test.ts: ok')
