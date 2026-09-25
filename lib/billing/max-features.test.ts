import assert from 'node:assert/strict'
import {
  hasEarlyAccess,
  hasMaxResourceVault,
  hasMaxWeeklyCoach,
  hasPriorityMarking,
  isMax,
  hasPaidAccess,
  hasFullMarksRewrite,
  MAX_WELCOME_CLAWBACK_DAYS,
  withinMaxWelcomeClawbackWindow,
} from '@/lib/billing/features'

assert.equal(isMax('max'), true)
assert.equal(isMax('pro'), false)
assert.equal(hasMaxResourceVault('max'), true)
assert.equal(hasMaxResourceVault('pro'), false)
assert.equal(hasPriorityMarking('max'), true)
assert.equal(hasMaxWeeklyCoach('max'), true)
assert.equal(hasEarlyAccess('max'), true)
// Shared paid features stay on Pro/Scholar — Max adds on top, does not strip.
assert.equal(hasPaidAccess('pro'), true)
assert.equal(hasFullMarksRewrite('pro'), true)
assert.equal(hasFullMarksRewrite('max'), true)

// --- welcome-gift clawback window -------------------------------------------
// The gift was never taken back: buy Max, collect 25 credits, refund, keep the
// credits. A revoke inside the window reverses it; a long-standing customer
// who leaves keeps what they were given.
{
  const granted = '2026-09-01T10:00:00Z'
  const day = 24 * 60 * 60 * 1000
  const at = (days: number) => new Date(new Date(granted).getTime() + days * day)
  assert.equal(withinMaxWelcomeClawbackWindow(granted, at(0)), true, 'same instant')
  assert.equal(withinMaxWelcomeClawbackWindow(granted, at(3)), true, 'three days in')
  assert.equal(
    withinMaxWelcomeClawbackWindow(granted, at(MAX_WELCOME_CLAWBACK_DAYS)),
    true,
    'the last day of the window is inside it'
  )
  assert.equal(
    withinMaxWelcomeClawbackWindow(granted, at(MAX_WELCOME_CLAWBACK_DAYS + 1)),
    false,
    'a day past the window keeps the gift'
  )
  assert.equal(withinMaxWelcomeClawbackWindow(granted, at(-1)), false, 'revoked before granted is nonsense, not a clawback')
  assert.equal(withinMaxWelcomeClawbackWindow(null, at(1)), false, 'never granted → nothing to take')
  assert.equal(withinMaxWelcomeClawbackWindow('garbage', at(1)), false)
  assert.equal(withinMaxWelcomeClawbackWindow(new Date(granted), at(1)), true, 'accepts a Date')
}

console.log('max-features.test.ts: ok')
