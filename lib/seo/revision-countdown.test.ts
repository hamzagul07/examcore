import assert from 'node:assert/strict'
import { buildCountdown, daysLeft } from './revision-countdown'

const DAY = 24 * 60 * 60 * 1000
const now = Date.parse('2026-01-01T00:00:00.000Z')

// daysLeft basic + clamp
assert.equal(daysLeft(now + 10 * DAY, now), 10, '10 days out')
assert.equal(daysLeft(now - 5 * DAY, now), 0, 'past date clamps to 0')

// Phases by distance
assert.equal(buildCountdown(now + 120 * DAY, now).phase, 'early', '>84d early')
assert.equal(buildCountdown(now + 60 * DAY, now).phase, 'plan', '29–84d plan')
assert.equal(buildCountdown(now + 20 * DAY, now).phase, 'build', '8–28d build')
assert.equal(buildCountdown(now + 5 * DAY, now).phase, 'final', '≤7d final')
assert.equal(buildCountdown(now, now).phase, 'exam-day', '0d exam-day')

// Weeks + pacing
let c = buildCountdown(now + 28 * DAY, now, 12)
assert.equal(c.weeksLeft, 4, '28d = 4 weeks')
assert.equal(c.papersPerWeek, 3, '12 papers / 4 weeks = 3 per week')

// Rounds up partial weeks
c = buildCountdown(now + 10 * DAY, now, 12)
assert.equal(c.weeksLeft, 2, '10d rounds to 2 weeks')
assert.equal(c.papersPerWeek, 6, '12 / 2 = 6')

// No target → no pacing number
assert.equal(buildCountdown(now + 28 * DAY, now).papersPerWeek, null, 'no target -> null')

// Exam day has no pacing
assert.equal(buildCountdown(now, now, 12).papersPerWeek, null, 'exam day -> null pacing')

console.log('lib/seo/revision-countdown.test.ts — all assertions passed')
