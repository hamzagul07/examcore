import assert from 'node:assert/strict'
import { AdaptiveConcurrency } from './adaptive-concurrency'

const ac = new AdaptiveConcurrency(6, { min: 2, max: 15, adjustIntervalMs: 1 })

assert.equal(ac.value, 6)

for (let i = 0; i < 20; i++) ac.recordApiOutcome(true)
for (let i = 0; i < 80; i++) ac.recordApiOutcome(false)

assert.equal(ac.value, 5, 'throttles down when 429 rate exceeds 10%')

const floor = new AdaptiveConcurrency(2, { min: 2, adjustIntervalMs: 1 })
for (let i = 0; i < 50; i++) floor.recordApiOutcome(true)
assert.equal(floor.value, 2, 'never drops below floor of 2')

console.log('adaptive-concurrency.test.ts: ok')
